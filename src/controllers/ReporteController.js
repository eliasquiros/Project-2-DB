// =============================================================================
// Controlador: ReporteController.js
// Módulo 5: Fe Pública y Certificación
// Issue 17: Generador de Atestados
// Issue 13: Bitácora de Auditoría y Trazabilidad
// Issue 1: Implementación de Lógica de Foliado y Asignación de Consecutivo Legal
// =============================================================================

const Auditoria = require('../models/Auditoria')
// Issue 17
const Certificacion = require('../models/Certificacion')
const { generarCertificacionPDF } = require('../services/PDFService')

// ── CERTIFICACIONES (Issue 17) ────────────────────────────────────

const generarCertificacion = async (req, res) => {
    try {
        const { id_asambleista, fecha_inicio, fecha_fin } = req.body

        if (!id_asambleista || !fecha_inicio || !fecha_fin) {
            return res.status(400).json({
                error: 'El asambleísta, fecha inicio y fecha fin son obligatorios'
            })
        }

        // Obtener todos los datos del asambleísta
        const datos = await Certificacion.obtenerDatosCertificacion(
            id_asambleista,
            fecha_inicio,
            fecha_fin
        )

        if (!datos) {
            return res.status(404).json({ error: 'Asambleísta no encontrado' })
        }

        // Generar el PDF y el hash
        // Pasamos folio temporal para el PDF, se actualizará después
        const datosConFolioTemp = { ...datos, folio_unico: 'PENDIENTE' }
        const { pdfBuffer, hash } = await generarCertificacionPDF(datosConFolioTemp)

        // Registrar en la BD, el trigger asigna el folio real automáticamente
        const certificacion = await Certificacion.registrarCertificacion(
            id_asambleista,
            hash,
            req.usuario.id
        )

        // Regenerar el PDF con el folio real
        const datosConFolioReal = { ...datos, folio_unico: certificacion.folio_unico }
        const { pdfBuffer: pdfFinal } = await generarCertificacionPDF(datosConFolioReal)

        // Devolver el PDF
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${certificacion.folio_unico}.pdf"`
        )
        res.send(pdfFinal)

    } catch (error) {
        console.error('Error al generar certificación:', error.message)
        res.status(500).json({ error: 'Error interno al generar la certificación' })
    }
}

// =============================================================================
// ── Foliado (Issue 1) ────────────────────────────────────
// Devuelve los datos del asambleísta para previsualizar SIN asignar folio
const previewCertificacion = async (req, res) => {
    try {
        const { id_asambleista, fecha_inicio, fecha_fin } = req.body

        if (!id_asambleista || !fecha_inicio || !fecha_fin) {
            return res.status(400).json({
                error: 'El asambleísta, fecha inicio y fecha fin son obligatorios'
            })
        }

        const datos = await Certificacion.obtenerPreviewCertificacion(
            id_asambleista,
            fecha_inicio,
            fecha_fin
        )

        if (!datos) {
            return res.status(404).json({ error: 'Asambleísta no encontrado' })
        }

        res.json(datos)
    } catch (error) {
        console.error('Error al generar preview:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}
// =============================================================================

// Verifica la autenticidad de una certificación por folio
const obtenerPorFolio = async (req, res) => {
    try {
        const { folio } = req.params

        const certificacion = await Certificacion.obtenerPorFolio(folio)

        if (!certificacion) {
            return res.status(404).json({ error: 'Certificación no encontrada' })
        }

        res.json(certificacion)
    } catch (error) {
        console.error('Error al obtener certificación:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

// Historial de certificaciones emitidas para el dashboard
const obtenerHistorial = async (req, res) => {
    try {
        const historial = await Certificacion.obtenerHistorial()
        res.json(historial)
    } catch (error) {
        console.error('Error al obtener historial:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
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
    previewCertificacion,
    obtenerPorFolio,
    obtenerHistorial,
    obtenerLogs,
    obtenerResumenAuditoria,
    obtenerCertificacionesPorMes,
    obtenerAsambleistasConsultados,
    obtenerTablasAuditadas
}