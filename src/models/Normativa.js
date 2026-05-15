// =============================================================================
// Modelo: Normativa.js
// Módulo 2: Estructura Normativa y Recursividad
// Issue 15: Gestión de Reformas
// =============================================================================

const pool = require('../config/db');

// Insertar una reforma y registrar el cambio normativo
const insertarReforma = async (id_resolucion, id_elemento_normativo, id_tipo_reforma, texto_anterior, texto_nuevo, fecha_inicio_vigencia) => {
    const query = `
        INSERT INTO reforma_aplicada 
            (id_resolucion, id_elemento_normativo, id_tipo_reforma, texto_anterior, texto_nuevo, fecha_inicio_vigencia)
        VALUES 
            ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    `;
    const valores = [id_resolucion, id_elemento_normativo, id_tipo_reforma, texto_anterior, texto_nuevo, fecha_inicio_vigencia];
    const resultado = await pool.query(query, valores);
    return resultado.rows[0];
};

// Obtener el historial de reformas de un elemento normativo
const obtenerHistorialReformas = async (id_elemento_normativo) => {
    const query = `
        SELECT 
            r.id_reforma,
            r.texto_anterior,
            r.texto_nuevo,
            r.fecha_inicio_vigencia,
            cm.nombre AS tipo_reforma,
            res.numero_resolucion,
            res.fecha_emision
        FROM reforma_aplicada r
        JOIN catalogo_maestro cm ON r.id_tipo_reforma = cm.id_item
        JOIN resolucion res      ON r.id_resolucion   = res.id_resolucion
        WHERE r.id_elemento_normativo = $1
        ORDER BY r.fecha_inicio_vigencia DESC;
    `;
    const resultado = await pool.query(query, [id_elemento_normativo]);
    return resultado.rows;
};

module.exports = {
    insertarReforma,
    obtenerHistorialReformas
};