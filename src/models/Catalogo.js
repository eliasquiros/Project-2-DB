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

module.exports = {
    obtenerSectores,
    obtenerRolesComision,
    obtenerTiposComision
};