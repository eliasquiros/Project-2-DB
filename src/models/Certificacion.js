// =============================================================================
// Modelo: Certificacion.js
// Módulo 5: Fe Pública y Certificación
// Issue 17: Motor de Generación de Certificaciones Legales con Validación de Seguridad
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
    const queryAsistencia = `
        SELECT * FROM calcular_porcentaje_asistencia($1, $2, $3)
    `
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
        SELECT DISTINCT
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
          AND (fecha_sesion IS NULL OR fecha_sesion BETWEEN $2 AND $3)
        ORDER BY fecha_sesion NULLS LAST
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
        asistencia,
        participaciones
    }
}

// Registrar una certificación emitida en la BD
// El trigger tg_folio_secuencial asigna el folio automáticamente
// Retorna el registro completo incluyendo el folio generado
const registrarCertificacion = async (id_asambleista, hash_seguridad, id_usuario) => {
    return ejecutarConAuditoria(id_usuario, async (client) => {
        const query = `
            INSERT INTO certificacion_emitida
                (id_asambleista, folio_unico, hash_seguridad, usuario_secretaria, estado)
            VALUES ($1, '', $2, $3, 'ACTIVO')
            RETURNING *
        `
        const resultado = await client.query(query, [
            id_asambleista,
            hash_seguridad,
            id_usuario
        ])
        return resultado.rows[0]
    })
}

// Obtener una certificación por su folio único
// Usado para verificación de autenticidad
const obtenerPorFolio = async (folio) => {
    const query = `
        SELECT
            ce.id_certificacion,
            ce.folio_unico,
            ce.hash_seguridad,
            ce.fecha_emision,
            ce.estado,
            a.nombre     AS nombre_asambleista,
            a.cedula,
            u.username   AS emitido_por
        FROM certificacion_emitida ce
        JOIN asambleista a  ON a.asambleista_id  = ce.id_asambleista
        JOIN sys_usuario u  ON u.id_usuario       = ce.usuario_secretaria
        WHERE ce.folio_unico = $1
    `
    const resultado = await pool.query(query, [folio])
    return resultado.rows[0] || null
}

// Obtener el historial de certificaciones emitidas.
// Usado en el dashboard de la Secretaría.
const obtenerHistorial = async () => {
    const query = `
        SELECT
            ce.id_certificacion,
            ce.folio_unico,
            ce.fecha_emision,
            ce.estado,
            a.nombre   AS nombre_asambleista,
            a.cedula,
            u.username AS emitido_por
        FROM certificacion_emitida ce
        JOIN asambleista a ON a.asambleista_id = ce.id_asambleista
        JOIN sys_usuario u ON u.id_usuario      = ce.usuario_secretaria
        ORDER BY ce.fecha_emision DESC
        LIMIT 100
    `
    const resultado = await pool.query(query)
    return resultado.rows
}

module.exports = {
    obtenerDatosCertificacion,
    registrarCertificacion,
    obtenerPorFolio,
    obtenerHistorial
}