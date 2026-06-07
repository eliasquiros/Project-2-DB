// =============================================================================
// Modelo: Catalogo.js
// Consultas SQL para los catálogos maestros del sistema
// =============================================================================

const {pool} = require('../config/db');

const obtenerSectores = async () => {
    const resultado = await pool.query(
        `SELECT id_item, nombre FROM catalogo_maestro 
         WHERE grupo_catalogo = 'SECTOR' AND activo = true`
    );
    return resultado.rows;
}

//Issue 7: Roles disponibles para asignar dentro de una comisión
const obtenerRolesComision = async () => {
    const resultado = await pool.query(
        `SELECT id_item, nombre FROM catalogo_maestro 
         WHERE grupo_catalogo = 'ROL_COMISION' AND activo = true
         ORDER BY nombre ASC`
    )
    return resultado.rows
}

const obtenerTiposComision = async () => {
    const resultado = await pool.query(
        `SELECT id_item, nombre FROM catalogo_maestro 
         WHERE grupo_catalogo = 'TIPO_COMISION' AND activo = true
         ORDER BY nombre ASC`
    )
    return resultado.rows
}

// Issue 11: Estados de asistencia existentes para asignar en las sesiones
const obtenerEstadosAsistencia = async () => {
    const resultado = await pool.query(
        `SELECT id_item, nombre FROM catalogo_maestro 
         WHERE grupo_catalogo = 'ESTADO_ASISTENCIA' AND activo = true
         ORDER BY nombre ASC`
    )
    return resultado.rows
}

// Issue 6: Motor de Reglas para Notas Condicionales
// CRUD para la tabla catalogo_nota_condicional

const obtenerNotasCondicionales = async () => {
    const resultado = await pool.query(
        `SELECT id_nota, codigo_tipo_origen, descripcion_interna, texto_nota, activo
         FROM catalogo_nota_condicional
         ORDER BY id_nota ASC`
    )
    return resultado.rows
}

const obtenerNotaPorId = async (id) => {
    const resultado = await pool.query(
        `SELECT id_nota, codigo_tipo_origen, descripcion_interna, texto_nota, activo
         FROM catalogo_nota_condicional
         WHERE id_nota = $1`,
        [id]
    )
    return resultado.rows[0] || null
}

const crearNota = async (codigo_tipo_origen, descripcion_interna, texto_nota) => {
    const resultado = await pool.query(
        `INSERT INTO catalogo_nota_condicional
            (codigo_tipo_origen, descripcion_interna, texto_nota, activo)
         VALUES ($1, $2, $3, TRUE)
         RETURNING *`,
        [codigo_tipo_origen, descripcion_interna, texto_nota]
    )
    return resultado.rows[0]
}

const actualizarNota = async (id, codigo_tipo_origen, descripcion_interna, texto_nota, activo) => {
    const resultado = await pool.query(
        `UPDATE catalogo_nota_condicional
         SET codigo_tipo_origen  = $1,
             descripcion_interna = $2,
             texto_nota          = $3,
             activo              = $4
         WHERE id_nota = $5
         RETURNING *`,
        [codigo_tipo_origen, descripcion_interna, texto_nota, activo, id]
    )
    return resultado.rows[0] || null
}

module.exports = {
    obtenerSectores,
    obtenerRolesComision,
    obtenerTiposComision,
    obtenerEstadosAsistencia,
    obtenerNotasCondicionales,
    obtenerNotaPorId,
    crearNota,
    actualizarNota
};