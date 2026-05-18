// =============================================================================
// Modelo: Catalogo.js
// Consultas SQL para los catálogos maestros del sistema
// =============================================================================

const pool = require('../config/db');

const obtenerSectores = async () => {
    const resultado = await pool.query(
        `SELECT id_item, nombre FROM catalogo_maestro 
         WHERE grupo_catalogo = 'SECTOR' AND activo = true`
    );
    return resultado.rows;
};

module.exports = {
    obtenerSectores
};