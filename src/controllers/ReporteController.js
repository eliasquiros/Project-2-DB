// =============================================================================
// Controlador: ReporteController.js
// Módulo 5: Fe Pública y Certificación
// Issue 17: Generador de Atestados (pendiente)
// Issue 13: Bitácora de Auditoría y Trazabilidad
// =============================================================================

const Auditoria = require('../models/Auditoria')

// ── CERTIFICACIONES (Issue 17 — pendiente) ────────────────────────────────────

const generarCertificacion = async (req, res) => {
    res.json({ mensaje: 'ReporteController - generarCertificacion OK' })
}

const obtenerPorFolio = async (req, res) => {
    res.json({ mensaje: 'ReporteController - obtenerPorFolio OK' })
}

// ── AUDITORÍA (Issue 13) ──────────────────────────────────────────────────────

// Obtener logs de auditoría con filtros opcionales
// Query params: fecha_inicio, fecha_fin, id_usuario, tabla_afectada
const obtenerLogs = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, id_usuario, tabla_afectada } = req.query

        const logs = await Auditoria.obtenerLogs({
            fecha_inicio:   fecha_inicio   || null,
            fecha_fin:      fecha_fin      || null,
            id_usuario:     id_usuario     || null,
            tabla_afectada: tabla_afectada || null
        })

        res.status(200).json({ logs })

    } catch (error) {
        console.error('Error al obtener logs de auditoría:', error.message)
        res.status(500).json({ error: 'Error interno al obtener la bitácora.' })
    }
}

// Obtener resumen general para el encabezado del dashboard
const obtenerResumenAuditoria = async (req, res) => {
    try {
        const resumen = await Auditoria.obtenerResumenGeneral()
        res.status(200).json(resumen)

    } catch (error) {
        console.error('Error al obtener resumen de auditoría:', error.message)
        res.status(500).json({ error: 'Error interno al obtener el resumen.' })
    }
}

// Obtener certificaciones agrupadas por mes para la gráfica del dashboard
const obtenerCertificacionesPorMes = async (req, res) => {
    try {
        const datos = await Auditoria.obtenerCertificacionesPorMes()
        res.status(200).json({ datos })

    } catch (error) {
        console.error('Error al obtener certificaciones por mes:', error.message)
        res.status(500).json({ error: 'Error interno al obtener las certificaciones por mes.' })
    }
}

// Obtener ranking de asambleístas con más certificaciones
const obtenerAsambleistasConsultados = async (req, res) => {
    try {
        const ranking = await Auditoria.obtenerAsambleistasConsultados()
        res.status(200).json({ ranking })

    } catch (error) {
        console.error('Error al obtener ranking de asambleístas:', error.message)
        res.status(500).json({ error: 'Error interno al obtener el ranking.' })
    }
}

// Obtener lista de tablas auditadas para el selector de filtros
const obtenerTablasAuditadas = async (req, res) => {
    try {
        const tablas = await Auditoria.obtenerTablasAuditadas()
        res.status(200).json({ tablas })

    } catch (error) {
        console.error('Error al obtener tablas auditadas:', error.message)
        res.status(500).json({ error: 'Error interno al obtener las tablas.' })
    }
}

module.exports = {
    generarCertificacion,
    obtenerPorFolio,
    obtenerLogs,
    obtenerResumenAuditoria,
    obtenerCertificacionesPorMes,
    obtenerAsambleistasConsultados,
    obtenerTablasAuditadas
}