// =============================================================================
// Controlador: ReporteController.js
// Módulo 5: Fe Pública y Certificación
// Issue 17: Generador de Atestados
// Issue 5:  Historial de Certificaciones y Re-impresión con Snapshot
// Issue 13: Bitácora de Auditoría y Trazabilidad
// Issue 1:  Implementación de Lógica de Foliado y Asignación de Consecutivo Legal
// Issue 6:  Motor de Reglas para Notas Condicionales
// =============================================================================

const Auditoria              = require('../models/Auditoria')
const Certificacion          = require('../models/Certificacion')
const Reporte                = require('../models/Reporte')
const Catalogo               = require('../models/Catalogo')
const { generarCertificacionPDF }    = require('../services/PDFService')
const { generarExcelEstadisticas }   = require('../services/ExcelService')

// ── CERTIFICACIONES (Issue 17 + Issue 5) ─────────────────────────────────────

const generarCertificacion = async (req, res) => {
    try {
        if (!['SECRETARIA', 'ADMIN'].includes(req.usuario.rol)) {
            return res.status(403).json({ error: 'No tiene permisos para emitir certificaciones.' })
        }
        const { id_asambleista, fecha_inicio, fecha_fin } = req.body

        if (!id_asambleista || !fecha_inicio || !fecha_fin) {
            return res.status(400).json({
                error: 'El asambleísta, fecha inicio y fecha fin son obligatorios'
            })
        }

        const datos = await Certificacion.obtenerDatosCertificacion(
            id_asambleista,
            fecha_inicio,
            fecha_fin
        )

        if (!datos) {
            return res.status(404).json({ error: 'Asambleísta no encontrado' })
        }

        const datosConFolioTemp = { ...datos, folio_unico: 'PENDIENTE' }
        const { pdfBuffer, hash } = await generarCertificacionPDF(datosConFolioTemp)

        const certificacion = await Certificacion.registrarCertificacion(
            id_asambleista,
            hash,
            req.usuario.id,
            datos
        )

        const datosConFolioReal = { ...datos, folio_unico: certificacion.folio_unico }
        const { pdfBuffer: pdfFinal } = await generarCertificacionPDF(datosConFolioReal)

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

// Issue 1: Previsualizar SIN asignar folio
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

// Issue 5: Re-impresión con snapshot
const reimprimirCertificacion = async (req, res) => {
    try {
        const { folio } = req.params

        if (!folio) {
            return res.status(400).json({ error: 'El folio es obligatorio.' })
        }

        const datos = await Certificacion.obtenerDatosParaReimpresion(folio)

        if (!datos) {
            return res.status(404).json({ error: 'Certificación no encontrada.' })
        }

        const certificacion = await Certificacion.obtenerPorFolio(folio)
        if (certificacion.estado === 'ANULADO') {
            return res.status(400).json({
                error: `La certificación ${folio} está anulada y no puede re-imprimirse.`
            })
        }

        const { pdfBuffer } = await generarCertificacionPDF(datos)

        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="REIMP-${folio}.pdf"`
        )
        res.send(pdfBuffer)

    } catch (error) {
        console.error('Error al re-imprimir certificación:', error.message)
        res.status(500).json({ error: 'Error interno al re-imprimir la certificación.' })
    }
}

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

const obtenerResumenAuditoria = async (req, res) => {
    try {
        const resumen = await Auditoria.obtenerResumenGeneral()
        res.status(200).json(resumen)
    } catch (error) {
        console.error('Error al obtener resumen de auditoría:', error.message)
        res.status(500).json({ error: 'Error interno al obtener el resumen.' })
    }
}

const obtenerCertificacionesPorMes = async (req, res) => {
    try {
        const datos = await Auditoria.obtenerCertificacionesPorMes()
        res.status(200).json({ datos })
    } catch (error) {
        console.error('Error al obtener certificaciones por mes:', error.message)
        res.status(500).json({ error: 'Error interno al obtener las certificaciones por mes.' })
    }
}

const obtenerAsambleistasConsultados = async (req, res) => {
    try {
        const ranking = await Auditoria.obtenerAsambleistasConsultados()
        res.status(200).json({ ranking })
    } catch (error) {
        console.error('Error al obtener ranking de asambleístas:', error.message)
        res.status(500).json({ error: 'Error interno al obtener el ranking.' })
    }
}

const obtenerTablasAuditadas = async (req, res) => {
    try {
        const tablas = await Auditoria.obtenerTablasAuditadas()
        res.status(200).json({ tablas })
    } catch (error) {
        console.error('Error al obtener tablas auditadas:', error.message)
        res.status(500).json({ error: 'Error interno al obtener las tablas.' })
    }
}

// ── REPORTERÍA (Issue 16) ─────────────────────────────────────────────────────

const obtenerEstadisticas = async (req, res) => {
    try {
        const { anio } = req.query

        if (!anio || isNaN(anio)) {
            return res.status(400).json({ error: 'El año es inválido o no fue enviado' })
        }

        const [porMes, porSector, folios] = await Promise.all([
            Reporte.obtenerCertificacionesPorMes(anio),
            Reporte.obtenerDesglosePorSector(),
            Reporte.obtenerFoliosPorAnio(anio)
        ])

        res.json({ porMes, porSector, folios })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const exportarExcel = async (req, res) => {
    try {
        const { anio } = req.query

        if (!anio || isNaN(anio)) {
            return res.status(400).json({ error: 'El año es inválido o no fue enviado' })
        }

        const datos = await Reporte.exportarEstadisticas(anio)
        const buffer = generarExcelEstadisticas(datos, anio)

        res.setHeader('Content-Disposition', `attachment; filename="reporte-air-${anio}.xlsx"`)
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.send(buffer)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

// ── NOTAS CONDICIONALES (Issue 6) ─────────────────────────────────────────────

const obtenerNotasCondicionales = async (req, res) => {
    try {
        const notas = await Catalogo.obtenerNotasCondicionales()
        res.status(200).json({ notas })
    } catch (error) {
        console.error('Error al obtener notas condicionales:', error.message)
        res.status(500).json({ error: 'Error interno al obtener las notas.' })
    }
}

const crearNotaCondicional = async (req, res) => {
    try {
        const { codigo_tipo_origen, descripcion_interna, texto_nota } = req.body

        if (!codigo_tipo_origen || !texto_nota) {
            return res.status(400).json({ error: 'El código y el texto de la nota son obligatorios.' })
        }

        const nota = await Catalogo.crearNota(codigo_tipo_origen, descripcion_interna, texto_nota)
        res.status(201).json({ mensaje: 'Nota creada correctamente.', nota })
    } catch (error) {
        console.error('Error al crear nota condicional:', error.message)
        res.status(500).json({ error: 'Error interno al crear la nota.' })
    }
}

const actualizarNotaCondicional = async (req, res) => {
    try {
        const { id } = req.params
        const { codigo_tipo_origen, descripcion_interna, texto_nota, activo } = req.body

        if (!codigo_tipo_origen || !texto_nota) {
            return res.status(400).json({ error: 'El código y el texto de la nota son obligatorios.' })
        }

        const nota = await Catalogo.actualizarNota(
            id, codigo_tipo_origen, descripcion_interna, texto_nota, activo
        )

        if (!nota) {
            return res.status(404).json({ error: 'Nota no encontrada.' })
        }

        res.status(200).json({ mensaje: 'Nota actualizada correctamente.', nota })
    } catch (error) {
        console.error('Error al actualizar nota condicional:', error.message)
        res.status(500).json({ error: 'Error interno al actualizar la nota.' })
    }
}

module.exports = {
    generarCertificacion,
    previewCertificacion,
    reimprimirCertificacion,
    obtenerPorFolio,
    obtenerHistorial,
    obtenerLogs,
    obtenerResumenAuditoria,
    obtenerCertificacionesPorMes,
    obtenerAsambleistasConsultados,
    obtenerTablasAuditadas,
    obtenerEstadisticas,
    exportarExcel,
    obtenerNotasCondicionales,
    crearNotaCondicional,
    actualizarNotaCondicional
}