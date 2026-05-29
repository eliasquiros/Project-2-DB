// =============================================================================
// Modelo: Sesion.js
// Módulo 3: Sesiones y Trámite Legislativo
// Issue 11: Control de quórum y sesiones plenarias
// =============================================================================

const { pool, ejecutarConAuditoria } = require('../config/db')

// Obtener todas las sesiones plenarias ordenadas de más reciente a más antigua
const obtenerTodas = async () => {
    const query = `
        SELECT
            s.id_sesion,
            s.numero_sesion,
            s.fecha,
            s.quorum_requerido,
            s.link_acta,
            cm_ts.nombre   AS tipo_sesion,
            cm_tm.nombre   AS modalidad,
            COUNT(asp.id_asistencia) FILTER (
                WHERE cm_est.nombre = 'Presente'
            )              AS total_presentes
        FROM sesiones s
        JOIN catalogo_maestro cm_ts  ON cm_ts.id_item  = s.id_tipo_sesion
        JOIN catalogo_maestro cm_tm  ON cm_tm.id_item  = s.id_tipo_modalidad
        LEFT JOIN asistencia_sesion_plenaria asp
            ON asp.id_sesion = s.id_sesion
        LEFT JOIN catalogo_maestro cm_est
            ON cm_est.id_item = asp.id_estado_asistencia
        GROUP BY
            s.id_sesion,
            s.numero_sesion,
            s.fecha,
            s.quorum_requerido,
            s.link_acta,
            cm_ts.nombre,
            cm_tm.nombre
        ORDER BY s.fecha DESC
    `
    const resultado = await pool.query(query)
    return resultado.rows
}

// Obtener una sesión por ID con su lista de asistencia completa
const obtenerPorId = async (id) => {
    const querySesion = `
        SELECT
            s.id_sesion,
            s.numero_sesion,
            s.fecha,
            s.quorum_requerido,
            s.link_acta,
            cm_ts.nombre   AS tipo_sesion,
            cm_tm.nombre   AS modalidad
        FROM sesiones s
        JOIN catalogo_maestro cm_ts ON cm_ts.id_item = s.id_tipo_sesion
        JOIN catalogo_maestro cm_tm ON cm_tm.id_item = s.id_tipo_modalidad
        WHERE s.id_sesion = $1
    `
    const resultSesion = await pool.query(querySesion, [id])
    if (resultSesion.rows.length === 0) return null

    const queryAsistencia = `
        SELECT
            asp.id_asistencia,
            asp.id_asambleista,
            a.nombre             AS nombre_asambleista,
            a.cedula,
            cm_est.nombre        AS estado_asistencia,
            cm_est.id_item       AS id_estado_asistencia
        FROM asistencia_sesion_plenaria asp
        JOIN asambleista a
            ON a.asambleista_id = asp.id_asambleista
        JOIN catalogo_maestro cm_est
            ON cm_est.id_item = asp.id_estado_asistencia
        WHERE asp.id_sesion = $1
        ORDER BY a.nombre ASC
    `
    const resultAsistencia = await pool.query(queryAsistencia, [id])

    return {
        ...resultSesion.rows[0],
        asistencia: resultAsistencia.rows
    }
}

// Crear una nueva sesión plenaria
const crear = async (numero_sesion, fecha, quorum_requerido, id_tipo_sesion, id_tipo_modalidad, link_acta, id_usuario, client = null) => {
    const query = `
        INSERT INTO sesiones
            (numero_sesion, fecha, quorum_requerido, id_tipo_sesion, id_tipo_modalidad, link_acta)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `
    const ejecutor = client || pool
    const resultado = await ejecutor.query(query, [
        numero_sesion,
        fecha,
        quorum_requerido,
        id_tipo_sesion,
        id_tipo_modalidad,
        link_acta || null
    ])
    return resultado.rows[0]
}

// Registrar la asistencia de todos los asambleístas en una sesión.
// Si ya existe un registro para ese asambleísta en esa sesión lo actualiza.
const registrarAsistencia = async (id_sesion, asistencias, id_usuario) => {
    return ejecutarConAuditoria(id_usuario, async (client) => {
        for (const a of asistencias) {
            const query = `
                INSERT INTO asistencia_sesion_plenaria
                    (id_asambleista, id_sesion, id_estado_asistencia)
                VALUES ($1, $2, $3)
                ON CONFLICT (id_asambleista, id_sesion)
                DO UPDATE SET id_estado_asistencia = EXCLUDED.id_estado_asistencia
            `
            await client.query(query, [
                a.id_asambleista,
                id_sesion,
                a.id_estado_asistencia
            ])
        }
        return { registros: asistencias.length }
    })
}

// Validar si una sesión tiene quórum suficiente.
// Llama a la función SQL fn_validar_quorum que ya existe en la BD.
const validarQuorum = async (id_sesion) => {
    const queryQuorum = `SELECT validar_quorum_legal($1::INT) AS tiene_quorum`
    const resultQuorum = await pool.query(queryQuorum, [id_sesion])

    const querySesion = `
        SELECT
            s.quorum_requerido,
            COUNT(asp.id_asistencia) FILTER (
                WHERE cm.nombre = 'Presente'
            ) AS presentes
        FROM sesiones s
        LEFT JOIN asistencia_sesion_plenaria asp
            ON asp.id_sesion = s.id_sesion
        LEFT JOIN catalogo_maestro cm
            ON cm.id_item = asp.id_estado_asistencia
        WHERE s.id_sesion = $1
        GROUP BY s.quorum_requerido
    `
    const resultSesion = await pool.query(querySesion, [id_sesion])

    return {
        tiene_quorum: resultQuorum.rows[0].tiene_quorum,
        presentes: parseInt(resultSesion.rows[0]?.presentes || 0),
        quorum_requerido: parseInt(resultSesion.rows[0]?.quorum_requerido || 0)
    }
}

// Obtener los catálogos necesarios para el formulario de nueva sesión
const obtenerCatalogos = async () => {
    const query = `
        SELECT id_item, nombre, grupo_catalogo
        FROM catalogo_maestro
        WHERE grupo_catalogo IN ('TIPO_SESION', 'TIPO_MODALIDAD')
          AND activo = true
        ORDER BY grupo_catalogo, nombre
    `
    const resultado = await pool.query(query)

    const tipos_sesion = resultado.rows.filter(r => r.grupo_catalogo === 'TIPO_SESION')
    const tipos_modalidad = resultado.rows.filter(r => r.grupo_catalogo === 'TIPO_MODALIDAD')

    return { tipos_sesion, tipos_modalidad }
}

module.exports = {
    obtenerTodas,
    obtenerPorId,
    crear,
    registrarAsistencia,
    validarQuorum,
    obtenerCatalogos
}