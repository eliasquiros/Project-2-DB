// =============================================================================
// Modelo: Certificacion.js
// Módulo 5: Fe Pública y Certificación
// Issue 17: Motor de Generación de Certificaciones Legales
// Issue 5:  Historial de Certificaciones y Re-impresión con Snapshot
// =============================================================================

const { pool, ejecutarConAuditoria } = require('../config/db')

// Obtener los datos completos del asambleísta para la certificación
// Consulta la vista v_hoja_vida_asambleista y calcula la asistencia
const obtenerDatosCertificacion = async (id_asambleista, fecha_inicio, fecha_fin) => {

    // Datos base del asambleísta y su nombramiento activo
    const queryBase = `
        SELECT
            a.asambleista_id,
            a.nombre,
            a.cedula,
            a.correo_institucional,
            n.id_nombramiento,
            n.fecha_inicio   AS nombramiento_inicio,
            n.fecha_fin      AS nombramiento_fin,
            n.estado         AS nombramiento_estado,
            cm_sec.nombre    AS sector,
            cm_pue.nombre    AS puesto
        FROM asambleista a
        LEFT JOIN nombramiento n
            ON n.asambleista_id = a.asambleista_id
            AND n.estado = 'ACTIVO'
        LEFT JOIN catalogo_maestro cm_sec
            ON cm_sec.id_item = n.sector_id
        LEFT JOIN catalogo_maestro cm_pue
            ON cm_pue.id_item = n.id_puesto
        WHERE a.asambleista_id = $1
        LIMIT 1
    `
    const resultBase = await pool.query(queryBase, [id_asambleista])
    if (resultBase.rows.length === 0) return null
    const base = resultBase.rows[0]

    // Calcular asistencia en el período
    const queryAsistencia = `SELECT * FROM calcular_porcentaje_asistencia($1, $2, $3)`
    const resultAsistencia = await pool.query(queryAsistencia, [
        id_asambleista,
        fecha_inicio,
        fecha_fin
    ])
    const asistencia = resultAsistencia.rows[0] || {
        sesiones_asistidas: 0,
        sesiones_totales: 0,
        porcentaje: 0
    }

    // Obtener participaciones desde la vista consolidada
    const queryParticipaciones = `
        SELECT DISTINCT ON (propuesta_titulo, tipo_participacion)
            propuesta_titulo,
            codigo_air,
            etapa_propuesta,
            estado_propuesta,
            tipo_participacion,
            fecha_sesion,
            numero_sesion,
            numero_resolucion
        FROM v_hoja_vida_asambleista
        WHERE asambleista_id = $1
          AND (fecha_sesion IS NULL OR fecha_sesion BETWEEN $2::DATE AND $3::DATE)
        ORDER BY propuesta_titulo, tipo_participacion, fecha_sesion NULLS LAST
    `
    const resultParticipaciones = await pool.query(queryParticipaciones, [
        id_asambleista,
        fecha_inicio,
        fecha_fin
    ])

    // Para cada participación obtener la nota condicional si aplica
    const participaciones = await Promise.all(
        resultParticipaciones.rows.map(async (p) => {
            const queryNota = `
                SELECT obtener_nota_certificacion(id_propuesta) AS nota
                FROM propuesta
                WHERE codigo_air = $1
                LIMIT 1
            `
            let nota = null
            try {
                if (p.codigo_air) {
                    const resultNota = await pool.query(queryNota, [p.codigo_air])
                    nota = resultNota.rows[0]?.nota || null
                }
            } catch {
                nota = null
            }
            return { ...p, nota_condicional: nota }
        })
    )

    return {
        ...base,
        fecha_inicio,
        fecha_fin,
        asistencia,
        participaciones
    }
}

// Registrar una certificación emitida en la BD
// El trigger tg_folio_secuencial asigna el folio automáticamente
// Guarda snapshot_json con el estado exacto de los datos al momento de emisión
// Esto garantiza que una re-impresión futura muestre exactamente lo mismo que el original
const registrarCertificacion = async (id_asambleista, hash_seguridad, id_usuario, datos) => {
    return ejecutarConAuditoria(id_usuario, async (client) => {
        const query = `
            INSERT INTO certificacion_emitida
                (id_asambleista, folio_unico, hash_seguridad, usuario_secretaria, estado, snapshot_json)
            VALUES ($1, '', $2, $3, 'ACTIVO', $4)
            RETURNING *
        `
        const resultado = await client.query(query, [
            id_asambleista,
            hash_seguridad,
            id_usuario,
            JSON.stringify(datos)
        ])
        return resultado.rows[0]
    })
}

// Obtener una certificación por su folio único
// Usado para verificación de autenticidad y re-impresión
const obtenerPorFolio = async (folio) => {
    const query = `
        SELECT
            ce.id_certificacion,
            ce.folio_unico,
            ce.hash_seguridad,
            ce.fecha_emision,
            ce.estado,
            ce.snapshot_json,
            a.nombre       AS nombre_asambleista,
            a.cedula,
            u.username     AS emitido_por
        FROM certificacion_emitida ce
        JOIN asambleista a ON a.asambleista_id  = ce.id_asambleista
        JOIN sys_usuario u ON u.id_usuario       = ce.usuario_secretaria
        WHERE ce.folio_unico = $1
    `
    const resultado = await pool.query(query, [folio])
    return resultado.rows[0] || null
}

// Obtener los datos originales de una certificación para re-impresión
// Retorna el snapshot guardado al momento de emisión, NO los datos actuales
// Esto garantiza que el PDF re-impreso sea idéntico al original
const obtenerDatosParaReimpresion = async (folio) => {
    const certificacion = await obtenerPorFolio(folio)

    if (!certificacion) return null

    // Si tiene snapshot, usar esos datos exactos
    if (certificacion.snapshot_json) {
        return {
            ...certificacion.snapshot_json,
            folio_unico: certificacion.folio_unico
        }
    }

    // Si no tiene snapshot (certificaciones antiguas), retornar los datos básicos disponibles
    return {
        nombre:        certificacion.nombre_asambleista,
        cedula:        certificacion.cedula,
        folio_unico:   certificacion.folio_unico,
        fecha_emision: certificacion.fecha_emision,
        participaciones: [],
        asistencia: { sesiones_asistidas: 0, sesiones_totales: 0, porcentaje: 0 }
    }
}

// Obtener el historial de certificaciones emitidas
// Usado en el dashboard de la Secretaría
const obtenerHistorial = async () => {
    const query = `
        SELECT
            ce.id_certificacion,
            ce.folio_unico,
            ce.fecha_emision,
            ce.estado,
            a.nombre       AS nombre_asambleista,
            a.asambleista_id,
            a.cedula,
            u.username     AS emitido_por
        FROM certificacion_emitida ce
        JOIN asambleista a ON a.asambleista_id = ce.id_asambleista
        JOIN sys_usuario u ON u.id_usuario      = ce.usuario_secretaria
        ORDER BY ce.fecha_emision DESC
        LIMIT 100
    `
    const resultado = await pool.query(query)
    return resultado.rows
}

// -----------------------------------------------------------------------------
// Issue 1: Implementación de Lógica de Foliado y Asignación de Consecutivo Legal
// Obtener preview de datos para certificación sin registrar ni asignar folio
// Se usa para que la Secretaría revise antes de confirmar la emisión
// -----------------------------------------------------------------------------
const obtenerPreviewCertificacion = async (id_asambleista, fecha_inicio, fecha_fin) => {
    return obtenerDatosCertificacion(id_asambleista, fecha_inicio, fecha_fin)
}

module.exports = {
    obtenerDatosCertificacion,
    obtenerPreviewCertificacion,
    registrarCertificacion,
    obtenerPorFolio,
    obtenerDatosParaReimpresion,
    obtenerHistorial
}