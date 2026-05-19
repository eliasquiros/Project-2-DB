// =============================================================================
// Modelo: Nombramiento.js
// Módulo 1: Gestión de Identidad y Roles
// Issue 14: Historial de Nombramientos
// =============================================================================

const {pool} = require('../config/db')

// Obtener todos los nombramientos históricos de un asambleísta 
const obtenerPorAsambleista = async (id_asambleista) => {
    const query = `
        SELECT
            n.id_nombramiento,
            n.fecha_inicio,
            n.fecha_fin,
            n.estado,
            cm_sector.nombre AS sector,
            cm_puesto.nombre AS puesto
        FROM nombramiento n
        JOIN catalogo_maestro cm_sector ON n.sector_id = cm_sector.id_item
        LEFT JOIN catalogo_maestro cm_puesto ON n.id_puesto = cm_puesto.id_item
        WHERE n.asambleista_id = $1
        ORDER BY n.fecha_inicio DESC
    `
    const resultado = await pool.query(query, [id_asambleista])
    return resultado.rows
}

// Validar traslape de nombramientos activos
const validarTraslape = async (id_asambleista, fecha_inicio, fecha_fin) => {
    const query = `
        SELECT id_nombramiento
        FROM nombramiento
        WHERE asambleista_id = $1
          AND estado = 'ACTIVO'
          AND (
              fecha_fin IS NULL
              OR (fecha_inicio <= $3 AND (fecha_fin IS NULL OR fecha_fin >= $2))
          )
    `
    const resultado = await pool.query(query, [id_asambleista, fecha_inicio, fecha_fin || '9999-12-31'])
    return resultado.rows.length > 0
}

// Insertar nombramiento nuevo
const crear = async (id_asambleista, sector_id, id_puesto, fecha_inicio, fecha_fin, id_usuario_registro) => {
    const query = `
        INSERT INTO nombramiento 
            (asambleista_id, sector_id, id_puesto, fecha_inicio, fecha_fin, estado, id_usuario_registro)
        VALUES 
            ($1, $2, $3, $4, $5, 'ACTIVO', $6)
        RETURNING *
    `
    const resultado = await pool.query(query, [
        id_asambleista,
        sector_id,
        id_puesto || null,
        fecha_inicio,
        fecha_fin || null,
        id_usuario_registro
    ])
    return resultado.rows[0]
}



module.exports = {
    obtenerPorAsambleista,
    validarTraslape,
    crear,
    
}