// =============================================================================
// Modelo: Auditoria.js
// Módulo 3: Operatividad de Sesiones
// Issue 13: Bitácora de Auditoría y Trazabilidad
// =============================================================================

const { pool } = require('../config/db')

// Obtener logs de auditoría con filtros opcionales
// Filtros: fecha_inicio, fecha_fin, id_usuario, tabla_afectada
const obtenerLogs = async ({ fecha_inicio, fecha_fin, id_usuario, tabla_afectada } = {}) => {
    let condiciones = []
    let valores     = []
    let contador    = 1

    if (fecha_inicio) {
        condiciones.push(`l.fecha_hora >= $${contador}`)
        valores.push(fecha_inicio)
        contador++
    }

    if (fecha_fin) {
        condiciones.push(`l.fecha_hora <= $${contador}`)
        valores.push(fecha_fin)
        contador++
    }

    if (id_usuario) {
        condiciones.push(`l.id_usuario = $${contador}`)
        valores.push(id_usuario)
        contador++
    }

    if (tabla_afectada) {
        condiciones.push(`l.tabla_afectada = $${contador}`)
        valores.push(tabla_afectada)
        contador++
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : ''

    const query = `
        SELECT
            l.id_log,
            l.accion,
            l.tabla_afectada,
            l.registro_id,
            l.detalle,
            l.fecha_hora,
            l.dir_ip,
            u.username      AS usuario
        FROM sys_log_auditoria l
        LEFT JOIN sys_usuario u ON u.id_usuario = l.id_usuario
        ${where}
        ORDER BY l.fecha_hora DESC
        LIMIT 500
    `

    const resultado = await pool.query(query, valores)
    return resultado.rows
}

// Obtener resumen de certificaciones por mes
// Consume la vista v_certificaciones_por_mes ya definida en BD
const obtenerCertificacionesPorMes = async () => {
    const query = `
        SELECT anno, mes, total_emitidas, total_anuladas
        FROM v_certificaciones_por_mes
        ORDER BY anno DESC, mes DESC
        LIMIT 24
    `
    const resultado = await pool.query(query)
    return resultado.rows
}

// Obtener asambleístas con más certificaciones emitidas
// Consume la vista v_asambleistas_mas_consultados ya definida en BD
const obtenerAsambleistasConsultados = async () => {
    const query = `
        SELECT
            asambleista_id,
            nombre,
            cedula,
            total_certificaciones,
            ultima_certificacion
        FROM v_asambleistas_mas_consultados
        LIMIT 10
    `
    const resultado = await pool.query(query)
    return resultado.rows
}

// Obtener tablas disponibles para filtrar en el dashboard
const obtenerTablasAuditadas = async () => {
    const query = `
        SELECT DISTINCT tabla_afectada
        FROM sys_log_auditoria
        ORDER BY tabla_afectada ASC
    `
    const resultado = await pool.query(query)
    return resultado.rows.map(r => r.tabla_afectada)
}

// Obtener resumen general del sistema para el dashboard
const obtenerResumenGeneral = async () => {
    const query = `
        SELECT
            COUNT(*)                                            AS total_logs,
            COUNT(CASE WHEN accion = 'INSERT' THEN 1 END)::INT AS total_inserts,
            COUNT(CASE WHEN accion = 'UPDATE' THEN 1 END)::INT AS total_updates,
            COUNT(CASE WHEN accion = 'DELETE' THEN 1 END)::INT AS total_deletes,
            MAX(fecha_hora)                                     AS ultimo_evento
        FROM sys_log_auditoria
    `
    const resultado = await pool.query(query)
    return resultado.rows[0]
}

module.exports = {
    obtenerLogs,
    obtenerCertificacionesPorMes,
    obtenerAsambleistasConsultados,
    obtenerTablasAuditadas,
    obtenerResumenGeneral
}