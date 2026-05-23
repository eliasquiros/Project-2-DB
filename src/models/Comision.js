// =============================================================================
// Modelo: Comision.js
// Módulo 4: Comisiones e Informes
// Issue 7: Gestión de comisiones y proponentes
// =============================================================================

const { pool, ejecutarConAuditoria } = require('../config/db')

// Obtener todas las comisiones con su tipo y cantidad de integrantes activos
const obtenerTodos = async () => {
    const query = `
        SELECT
            c.id_comision,
            c.nombre_comision,
            c.fecha_creacion,
            c.activo,
            cm.nombre                                                    AS tipo_comision,
            COUNT(ic.id_integrante_comision)
                FILTER (WHERE ic.estado = 'ACTIVO')                      AS total_integrantes
        FROM comision c
        JOIN catalogo_maestro cm
            ON cm.id_item = c.id_tipo_comision
        LEFT JOIN integrante_comision ic
            ON ic.id_comision = c.id_comision
        GROUP BY
            c.id_comision,
            c.nombre_comision,
            c.fecha_creacion,
            c.activo,
            cm.nombre
        ORDER BY c.fecha_creacion DESC
    `
    const resultado = await pool.query(query)
    return resultado.rows
}

// Obtener una comisión por su id junto con sus integrantes activos
const obtenerPorId = async (id) => {
    const queryComision = `
        SELECT
            c.id_comision,
            c.nombre_comision,
            c.fecha_creacion,
            c.activo,
            cm.nombre AS tipo_comision
        FROM comision c
        JOIN catalogo_maestro cm
            ON cm.id_item = c.id_tipo_comision
        WHERE c.id_comision = $1
    `
    const resultComision = await pool.query(queryComision, [id])
    if (resultComision.rows.length === 0) return null

    const queryIntegrantes = `
        SELECT
            ic.id_integrante_comision,
            ic.fecha_ingreso,
            ic.fecha_fin,
            ic.estado,
            cm_rol.nombre        AS rol,
            a.asambleista_id,
            a.nombre             AS nombre_asambleista,
            a.cedula
        FROM integrante_comision ic
        JOIN asambleista a
            ON a.asambleista_id = ic.id_asambleista
        JOIN catalogo_maestro cm_rol
            ON cm_rol.id_item = ic.id_rol_comision
        WHERE ic.id_comision = $1
          AND ic.estado = 'ACTIVO'
        ORDER BY a.nombre ASC
    `
    const resultIntegrantes = await pool.query(queryIntegrantes, [id])

    return {
        ...resultComision.rows[0],
        integrantes: resultIntegrantes.rows
    }
}

// Crear una nueva comisión 
// Recibe client cuando se llama desde ejecutarConAuditoria,
// si no se pasa client usa el pool directamente.
const crear = async (id_tipo_comision, nombre_comision, client = null) => {
    const query = `
        INSERT INTO comision (id_tipo_comision, nombre_comision)
        VALUES ($1, $2)
        RETURNING *
    `
    const ejecutor = client || pool
    const resultado = await ejecutor.query(query, [id_tipo_comision, nombre_comision])
    return resultado.rows[0]
}

// Asignar un asambleísta a una comisión con su rol
const asignarIntegrante = async (id_comision, id_asambleista, id_rol_comision, fecha_ingreso, client = null) => {
    const ejecutor = client || pool

    const queryVerificar = `
        SELECT id_integrante_comision
        FROM integrante_comision
        WHERE id_comision    = $1
          AND id_asambleista = $2
          AND estado         = 'ACTIVO'
    `
    const existe = await ejecutor.query(queryVerificar, [id_comision, id_asambleista])
    if (existe.rows.length > 0) {
        throw new Error('El asambleísta ya es integrante activo de esta comisión')
    }

    const query = `
        INSERT INTO integrante_comision
            (id_comision, id_asambleista, id_rol_comision, fecha_ingreso)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `
    const resultado = await ejecutor.query(query, [
        id_comision,
        id_asambleista,
        id_rol_comision,
        fecha_ingreso
    ])
    return resultado.rows[0]
}

// Obtener todas las sesiones internas de una comisión y su conteo de asistentes
const obtenerSesiones = async (id_comision) => {
    const query = `
        SELECT
            sc.id_sesion_comision,
            sc.fecha_hora,
            sc.lugar,
            COUNT(asc2.id_asistencia_comision) AS total_asistentes
        FROM sesion_comision sc
        LEFT JOIN asistencia_sesion_comision asc2
            ON asc2.id_sesion_comision = sc.id_sesion_comision
        WHERE sc.id_comision = $1
        GROUP BY sc.id_sesion_comision, sc.fecha_hora, sc.lugar
        ORDER BY sc.fecha_hora DESC
    `
    const resultado = await pool.query(query, [id_comision])
    return resultado.rows
}

// Registrar una sesión interna y la asistencia de los integrantes
// Si algo falla, todo se revierte
const registrarSesion = async (id_comision, fecha_hora, lugar, asistencias, id_usuario) => {
    return ejecutarConAuditoria(id_usuario, async (client) => {
        const querySesion = `
            INSERT INTO sesion_comision (id_comision, fecha_hora, lugar)
            VALUES ($1, $2, $3)
            RETURNING *
        `
        const resultSesion = await client.query(querySesion, [id_comision, fecha_hora, lugar])
        const sesion = resultSesion.rows[0]

        for (const asistencia of asistencias) {
            const queryAsistencia = `
                INSERT INTO asistencia_sesion_comision
                    (id_sesion_comision, id_asambleista, id_comision, id_estado_asistencia)
                VALUES ($1, $2, $3, $4)
            `
            await client.query(queryAsistencia, [
                sesion.id_sesion_comision,
                asistencia.id_asambleista,
                id_comision,
                asistencia.id_estado_asistencia
            ])
        }

        return sesion
    })
}

module.exports = {
    obtenerTodos,
    obtenerPorId,
    crear,
    asignarIntegrante,
    obtenerSesiones,
    registrarSesion
}