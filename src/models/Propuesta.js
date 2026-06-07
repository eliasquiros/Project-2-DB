// =============================================================================
// Modelo: Propuesta.js
// Módulo 2: Gestión Normativa y Propuestas de Reforma
// Issue: Formulario de Propuesta de Reforma
// =============================================================================

const { pool, ejecutarConAuditoria } = require('../config/db')

// ── CATÁLOGOS ────────────────────────────────────────────────────────────────
// Consultas auxiliares para alimentar los selects del formulario

const obtenerEtapasPropuesta = async () => {
    const resultado = await pool.query(
        `SELECT id_item, nombre FROM catalogo_maestro
         WHERE grupo_catalogo = 'ETAPA_PROPUESTA' AND activo = true
         ORDER BY id_item ASC`
    )
    return resultado.rows
}

const obtenerEstadosPropuesta = async () => {
    const resultado = await pool.query(
        `SELECT id_item, nombre FROM catalogo_maestro
         WHERE grupo_catalogo = 'ESTADO_PROPUESTA' AND activo = true
         ORDER BY id_item ASC`
    )
    return resultado.rows
}

const obtenerTiposMayoria = async () => {
    const resultado = await pool.query(
        `SELECT id_item, nombre FROM catalogo_maestro
         WHERE grupo_catalogo = 'TIPO_MAYORIA' AND activo = true
         ORDER BY id_item ASC`
    )
    return resultado.rows
}

const obtenerTiposReforma = async () => {
    const resultado = await pool.query(
        `SELECT id_item, nombre FROM catalogo_maestro
         WHERE grupo_catalogo = 'TIPO_REFORMA' AND activo = true
         ORDER BY id_item ASC`
    )
    return resultado.rows
}

// ── CRUD DE PROPUESTAS ───────────────────────────────────────────────────────

// Crear una nueva propuesta de reforma
// Recibe los datos del formulario y los proponentes (array de ids de asambleístas)
// y los elementos normativos afectados (array de ids de elementos)
const crearPropuesta = async (datos, id_usuario) => {
    return ejecutarConAuditoria(id_usuario, async (client) => {

        // 1. Insertar la propuesta principal
        const queryPropuesta = `
            INSERT INTO propuesta (
                id_reglamento_base,
                id_etapa_propuesta,
                id_estado_propuesta,
                id_propuesta_padre,
                titulo,
                texto_sustitutivo,
                codigo_air,
                id_tipo_mayoria_requerida
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `
        const resultPropuesta = await client.query(queryPropuesta, [
            datos.id_reglamento_base || null,
            datos.id_etapa_propuesta,
            datos.id_estado_propuesta,
            datos.id_propuesta_padre || null,
            datos.titulo,
            datos.texto_sustitutivo || null,
            datos.codigo_air || null,
            datos.id_tipo_mayoria_requerida
        ])
        const propuesta = resultPropuesta.rows[0]

        // 2. Insertar los proponentes (relación N:M)
        if (datos.proponentes && datos.proponentes.length > 0) {
            for (const id_asambleista of datos.proponentes) {
                await client.query(
                    `INSERT INTO proponente_propuesta (id_propuesta, id_asambleista, fecha_registro)
                     VALUES ($1, $2, CURRENT_DATE)
                     ON CONFLICT (id_propuesta, id_asambleista) DO NOTHING`,
                    [propuesta.id_propuesta, id_asambleista]
                )
            }
        }

        // 3. Insertar los elementos normativos afectados (tabla propuesta_elemento_afectado)
        if (datos.elementos_afectados && datos.elementos_afectados.length > 0) {
            for (const elem of datos.elementos_afectados) {
                await client.query(
                    `INSERT INTO propuesta_elemento_afectado (
                        id_propuesta, id_elemento, modalidad_reforma,
                        cuerpo_propuesta, link_documentacion
                     ) VALUES ($1, $2, $3, $4, $5)`,
                    [
                        propuesta.id_propuesta,
                        elem.id_elemento,
                        elem.modalidad_reforma || 'SUSTITUTIVO',
                        elem.cuerpo_propuesta || null,
                        elem.link_documentacion || null
                    ]
                )
            }
        }

        // 4. Registrar en la bitácora de propuesta
        await client.query(
            `INSERT INTO bitacora_propuesta (
                id_propuesta, id_reglamento_base, id_etapa_propuesta,
                id_estado_propuesta, titulo, codigo_air,
                fecha_modificacion, usuario_modificacion
             ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)`,
            [
                propuesta.id_propuesta,
                datos.id_reglamento_base || null,
                datos.id_etapa_propuesta,
                datos.id_estado_propuesta,
                datos.titulo,
                datos.codigo_air || null,
                id_usuario
            ]
        )

        return propuesta
    })
}

// Obtener todas las propuestas con sus relaciones
const obtenerTodas = async () => {
    const query = `
        SELECT
            p.id_propuesta,
            p.titulo,
            p.codigo_air,
            p.texto_sustitutivo,
            r.nombre_normativa  AS reglamento,
            r.sigla             AS reglamento_sigla,
            cm_et.nombre        AS etapa,
            cm_es.nombre        AS estado,
            cm_may.nombre       AS tipo_mayoria,
            p.id_etapa_propuesta,
            p.id_estado_propuesta,
            p.id_tipo_mayoria_requerida,
            p.id_reglamento_base
        FROM propuesta p
        LEFT JOIN reglamento r ON r.id_reglamento = p.id_reglamento_base
        JOIN catalogo_maestro cm_et  ON cm_et.id_item = p.id_etapa_propuesta
        JOIN catalogo_maestro cm_es  ON cm_es.id_item = p.id_estado_propuesta
        JOIN catalogo_maestro cm_may ON cm_may.id_item = p.id_tipo_mayoria_requerida
        ORDER BY p.id_propuesta DESC
    `
    const resultado = await pool.query(query)
    return resultado.rows
}

// Obtener una propuesta por ID con proponentes y elementos afectados
const obtenerPorId = async (id_propuesta) => {
    // Datos base de la propuesta
    const queryBase = `
        SELECT
            p.id_propuesta,
            p.titulo,
            p.codigo_air,
            p.texto_sustitutivo,
            p.id_reglamento_base,
            p.id_etapa_propuesta,
            p.id_estado_propuesta,
            p.id_tipo_mayoria_requerida,
            p.id_propuesta_padre,
            r.nombre_normativa  AS reglamento,
            r.sigla             AS reglamento_sigla,
            cm_et.nombre        AS etapa,
            cm_es.nombre        AS estado,
            cm_may.nombre       AS tipo_mayoria
        FROM propuesta p
        LEFT JOIN reglamento r ON r.id_reglamento = p.id_reglamento_base
        JOIN catalogo_maestro cm_et  ON cm_et.id_item = p.id_etapa_propuesta
        JOIN catalogo_maestro cm_es  ON cm_es.id_item = p.id_estado_propuesta
        JOIN catalogo_maestro cm_may ON cm_may.id_item = p.id_tipo_mayoria_requerida
        WHERE p.id_propuesta = $1
    `
    const resultBase = await pool.query(queryBase, [id_propuesta])
    if (resultBase.rows.length === 0) return null
    const propuesta = resultBase.rows[0]

    // Proponentes
    const queryProponentes = `
        SELECT
            pp.id_proponente_propuesta,
            pp.id_asambleista,
            a.nombre,
            a.cedula,
            pp.fecha_registro
        FROM proponente_propuesta pp
        JOIN asambleista a ON a.asambleista_id = pp.id_asambleista
        WHERE pp.id_propuesta = $1
        ORDER BY pp.fecha_registro
    `
    const resultProponentes = await pool.query(queryProponentes, [id_propuesta])

    // Elementos afectados
    const queryElementos = `
        SELECT
            pea.id_propuesta_elemento,
            pea.id_elemento,
            pea.modalidad_reforma,
            pea.cuerpo_propuesta,
            pea.link_documentacion,
            en.numero_etiqueta,
            en.contenido_texto,
            cm_nivel.nombre AS nivel
        FROM propuesta_elemento_afectado pea
        JOIN elemento_normativo en ON en.id_elemento = pea.id_elemento
        JOIN catalogo_maestro cm_nivel ON cm_nivel.id_item = en.id_nivel_reglamento
        WHERE pea.id_propuesta = $1
        ORDER BY en.orden
    `
    const resultElementos = await pool.query(queryElementos, [id_propuesta])

    return {
        ...propuesta,
        proponentes: resultProponentes.rows,
        elementos_afectados: resultElementos.rows
    }
}

// Cambiar estado de una propuesta (ej: Borrador → Pendiente de Revisión)
const cambiarEstado = async (id_propuesta, id_nuevo_estado, id_usuario) => {
    return ejecutarConAuditoria(id_usuario, async (client) => {
        // Obtener estado actual para la bitácora
        const actual = await client.query(
            'SELECT * FROM propuesta WHERE id_propuesta = $1',
            [id_propuesta]
        )
        if (actual.rows.length === 0) return null

        const prop = actual.rows[0]

        // Actualizar el estado
        const resultado = await client.query(
            `UPDATE propuesta SET id_estado_propuesta = $1 WHERE id_propuesta = $2 RETURNING *`,
            [id_nuevo_estado, id_propuesta]
        )

        // Registrar en bitácora
        await client.query(
            `INSERT INTO bitacora_propuesta (
                id_propuesta, id_reglamento_base, id_etapa_propuesta,
                id_estado_propuesta, titulo, codigo_air,
                fecha_modificacion, usuario_modificacion
             ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)`,
            [
                id_propuesta,
                prop.id_reglamento_base,
                prop.id_etapa_propuesta,
                id_nuevo_estado,
                prop.titulo,
                prop.codigo_air,
                id_usuario
            ]
        )

        return resultado.rows[0]
    })
}

// Obtener la bitácora de cambios de una propuesta
const obtenerBitacora = async (id_propuesta) => {
    const query = `
        SELECT
            bp.id_registro_bitacora,
            bp.titulo,
            bp.codigo_air,
            cm_et.nombre AS etapa,
            cm_es.nombre AS estado,
            bp.fecha_modificacion,
            u.username   AS usuario
        FROM bitacora_propuesta bp
        JOIN catalogo_maestro cm_et ON cm_et.id_item = bp.id_etapa_propuesta
        JOIN catalogo_maestro cm_es ON cm_es.id_item = bp.id_estado_propuesta
        LEFT JOIN sys_usuario u ON u.id_usuario = bp.usuario_modificacion
        WHERE bp.id_propuesta = $1
        ORDER BY bp.fecha_modificacion DESC
    `
    const resultado = await pool.query(query, [id_propuesta])
    return resultado.rows
}

module.exports = {
    obtenerEtapasPropuesta,
    obtenerEstadosPropuesta,
    obtenerTiposMayoria,
    obtenerTiposReforma,
    crearPropuesta,
    obtenerTodas,
    obtenerPorId,
    cambiarEstado,
    obtenerBitacora
}
