// Issue #16 — Exportación de Datos y Reportería Administrativa
// Consulta las vistas SQL y datos crudos para estadísticas y exportación

const { pool } = require('../config/db')

// Certificaciones por mes de un año específico
// Alimenta el gráfico de barras de la vista
const obtenerCertificacionesPorMes = async (anio) => {
    const query = `
        SELECT mes, total_certificaciones
        FROM vista_certificaciones_por_mes
        WHERE anio = $1
        ORDER BY mes ASC
    `
    const resultado = await pool.query(query, [parseInt(anio)])
    return resultado.rows
}

// Desglose de nombramientos activos por sector
// Alimenta el gráfico de pastel de la vista
const obtenerDesglosePorSector = async () => {
    const query = `
        SELECT sector, total_nombramientos
        FROM vista_nombramientos_por_sector
    `
    const resultado = await pool.query(query)
    return resultado.rows
}

// Total de folios emitidos por año
// Alimenta la tarjeta de métrica rápida
const obtenerFoliosPorAnio = async (anio) => {
    const query = `
        SELECT anio, total_folios
        FROM vista_folios_por_anio
        WHERE anio = $1
    `
    const resultado = await pool.query(query, [parseInt(anio)])
    return resultado.rows[0] || { anio: parseInt(anio), total_folios: 0 }
}

// Datos crudos de certificaciones para exportación Excel
// Devuelve todos los campos necesarios para el archivo descargable
const exportarEstadisticas = async (anio) => {
    const [porMes, porSector, folios] = await Promise.all([
        obtenerCertificacionesPorMes(anio),
        obtenerDesglosePorSector(),
        obtenerFoliosPorAnio(anio)
    ])

    return {
        porMes,
        porSector,
        folios
    }
}

module.exports = {
    obtenerCertificacionesPorMes,
    obtenerDesglosePorSector,
    obtenerFoliosPorAnio,
    exportarEstadisticas
}