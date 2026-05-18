// =============================================================================
// Modelo: Asambleista.js
// Módulo 1: Gestión de Identidad y Roles
// Issue 9: Catálogo de Asambleístas
// =============================================================================

const {pool} = require('../config/db')

// Obtener todos los asambleístas con su estado de nombramiento actual
const obtenerTodos = async () => {
    const query = `
        SELECT
            a.asambleista_id,
            a.cedula,
            a.nombre,
            a.correo_institucional,
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM nombramiento n
                    WHERE n.asambleista_id = a.asambleista_id
                      AND n.estado = 'ACTIVO'
                      AND (n.fecha_fin IS NULL OR n.fecha_fin >= CURRENT_DATE)
                ) THEN 'VIGENTE'
                ELSE 'INACTIVO'
            END AS estado
        FROM asambleista a
        ORDER BY a.nombre ASC
    `
    const resultado = await pool.query(query)
    return resultado.rows
}

// Obtener asambleísta por ID
const obtenerPorId = async (id) => {
    const query = `
        SELECT
            a.asambleista_id,
            a.cedula,
            a.nombre,
            a.correo_institucional
        FROM asambleista a
        WHERE a.asambleista_id = $1
    `
    const resultado = await pool.query(query, [id])
    return resultado.rows[0]
}

// Obtener un asambleísta por cédula (verificar duplicados antes de crear un asambleísta)
const obtenerPorCedula = async (cedula) => {
    const query = `
        SELECT asambleista_id, cedula, nombre
        FROM asambleista
        WHERE cedula = $1
    `
    const resultado = await pool.query(query, [cedula])
    return resultado.rows[0]
}

// Crear un nuevo asambleísta
const crear = async (cedula, nombre, correo_institucional) => {
    const query = `
        INSERT INTO asambleista (cedula, nombre, correo_institucional)
        VALUES ($1, $2, $3)
        RETURNING *
    `
    const resultado = await pool.query(query, [cedula, nombre, correo_institucional])
    return resultado.rows[0]
}

// Actualizar datos de un asambleísta y registrar el cambio en bitácora
const actualizar = async (id, cedula, nombre, correo_institucional, razon_cambio) => {
    const anterior = await obtenerPorId(id)
    if (!anterior) return null

    const queryBitacora = `
        INSERT INTO bitacora_asambleistas 
            (asambleista_id, cedula_anterior, nombre_anterior, razon_cambio)
        VALUES ($1, $2, $3, $4)
    `
    await pool.query(queryBitacora, [
        id,
        anterior.cedula,
        anterior.nombre,
        razon_cambio || 'Actualización de datos'
    ])

    const queryUpdate = `
        UPDATE asambleista
        SET cedula = $1, nombre = $2, correo_institucional = $3
        WHERE asambleista_id = $4
        RETURNING *
    `
    const resultado = await pool.query(queryUpdate, [cedula, nombre, correo_institucional, id])
    return resultado.rows[0]
}

module.exports = {
    obtenerTodos,
    obtenerPorId,
    obtenerPorCedula,
    crear,
    actualizar
}