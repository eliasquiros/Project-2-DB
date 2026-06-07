// =============================================================================
// Controlador: PropuestaController.js
// Módulo 2: Gestión Normativa y Propuestas de Reforma
// Issue: Formulario de Propuesta de Reforma
// =============================================================================

const Propuesta  = require('../models/Propuesta')
const Normativa  = require('../models/Normativa')

// ── CATÁLOGOS ────────────────────────────────────────────────────────────────
// Devuelve todos los catálogos necesarios para armar el formulario de propuesta

const obtenerCatalogosPropuesta = async (req, res) => {
    try {
        const [etapas, estados, tiposMayoria, tiposReforma, reglamentos] = await Promise.all([
            Propuesta.obtenerEtapasPropuesta(),
            Propuesta.obtenerEstadosPropuesta(),
            Propuesta.obtenerTiposMayoria(),
            Propuesta.obtenerTiposReforma(),
            Normativa.obtenerReglamentos()
        ])

        res.json({ etapas, estados, tiposMayoria, tiposReforma, reglamentos })
    } catch (error) {
        console.error('Error al obtener catálogos de propuesta:', error.message)
        res.status(500).json({ error: 'Error interno al cargar catálogos.' })
    }
}

// ── LISTADO ──────────────────────────────────────────────────────────────────

const obtenerTodas = async (req, res) => {
    try {
        const propuestas = await Propuesta.obtenerTodas()
        res.json(propuestas)
    } catch (error) {
        console.error('Error al obtener propuestas:', error.message)
        res.status(500).json({ error: 'Error interno del servidor.' })
    }
}

// ── DETALLE ──────────────────────────────────────────────────────────────────

const obtenerPorId = async (req, res) => {
    try {
        const { id } = req.params

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID de propuesta inválido.' })
        }

        const propuesta = await Propuesta.obtenerPorId(parseInt(id))

        if (!propuesta) {
            return res.status(404).json({ error: 'Propuesta no encontrada.' })
        }

        res.json(propuesta)
    } catch (error) {
        console.error('Error al obtener propuesta:', error.message)
        res.status(500).json({ error: 'Error interno del servidor.' })
    }
}

// ── CREAR PROPUESTA ──────────────────────────────────────────────────────────
// Recibe el formulario completo de propuesta de reforma

const crearPropuesta = async (req, res) => {
    try {
        const {
            titulo,
            id_reglamento_base,
            id_etapa_propuesta,
            id_estado_propuesta,
            id_tipo_mayoria_requerida,
            id_propuesta_padre,
            texto_sustitutivo,
            codigo_air,
            proponentes,           // Array de ids de asambleístas
            elementos_afectados    // Array de { id_elemento, modalidad_reforma, cuerpo_propuesta, link_documentacion }
        } = req.body

        // Validaciones obligatorias
        if (!titulo || !titulo.trim()) {
            return res.status(400).json({ error: 'El título de la propuesta es obligatorio.' })
        }

        if (!id_etapa_propuesta) {
            return res.status(400).json({ error: 'La etapa del proceso es obligatoria.' })
        }

        if (!id_estado_propuesta) {
            return res.status(400).json({ error: 'El estado de la propuesta es obligatorio.' })
        }

        if (!id_tipo_mayoria_requerida) {
            return res.status(400).json({ error: 'El tipo de mayoría requerida es obligatorio.' })
        }

        if (!proponentes || !Array.isArray(proponentes) || proponentes.length === 0) {
            return res.status(400).json({ error: 'Debe seleccionar al menos un proponente.' })
        }

        if (!elementos_afectados || !Array.isArray(elementos_afectados) || elementos_afectados.length === 0) {
            return res.status(400).json({ error: 'Debe seleccionar al menos un elemento normativo afectado.' })
        }

        const propuesta = await Propuesta.crearPropuesta({
            titulo: titulo.trim(),
            id_reglamento_base,
            id_etapa_propuesta,
            id_estado_propuesta,
            id_tipo_mayoria_requerida,
            id_propuesta_padre,
            texto_sustitutivo,
            codigo_air,
            proponentes,
            elementos_afectados
        }, req.usuario.id)

        res.status(201).json({
            mensaje: 'Propuesta de reforma creada exitosamente.',
            propuesta
        })

    } catch (error) {
        console.error('Error al crear propuesta:', error.message)
        res.status(500).json({ error: 'Error interno al crear la propuesta.' })
    }
}

// ── GUARDAR BORRADOR ─────────────────────────────────────────────────────────
// Guarda la propuesta con estado "Borrador"

const guardarBorrador = async (req, res) => {
    try {
        // Buscar el id_item del estado "Borrador"
        const estados = await Propuesta.obtenerEstadosPropuesta()
        const borrador = estados.find(e => e.nombre === 'Borrador')

        if (!borrador) {
            return res.status(500).json({ error: 'No se encontró el estado Borrador en el catálogo.' })
        }

        // Forzar el estado a Borrador
        req.body.id_estado_propuesta = borrador.id_item

        // Delegar al método de creación normal
        return crearPropuesta(req, res)

    } catch (error) {
        console.error('Error al guardar borrador:', error.message)
        res.status(500).json({ error: 'Error interno al guardar el borrador.' })
    }
}

// ── VALIDAR Y PRESENTAR ─────────────────────────────────────────────────────
// Guarda la propuesta con estado "Pendiente de Revisión"

const validarYPresentar = async (req, res) => {
    try {
        const estados = await Propuesta.obtenerEstadosPropuesta()
        const pendiente = estados.find(e => e.nombre === 'Pendiente de Revisión')

        if (!pendiente) {
            return res.status(500).json({ error: 'No se encontró el estado Pendiente de Revisión en el catálogo.' })
        }

        req.body.id_estado_propuesta = pendiente.id_item

        return crearPropuesta(req, res)

    } catch (error) {
        console.error('Error al validar y presentar:', error.message)
        res.status(500).json({ error: 'Error interno al presentar la propuesta.' })
    }
}

// ── CAMBIAR ESTADO ───────────────────────────────────────────────────────────

const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params
        const { id_estado_propuesta } = req.body

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID de propuesta inválido.' })
        }

        if (!id_estado_propuesta) {
            return res.status(400).json({ error: 'El nuevo estado es obligatorio.' })
        }

        const resultado = await Propuesta.cambiarEstado(
            parseInt(id),
            id_estado_propuesta,
            req.usuario.id
        )

        if (!resultado) {
            return res.status(404).json({ error: 'Propuesta no encontrada.' })
        }

        res.json({
            mensaje: 'Estado de propuesta actualizado.',
            propuesta: resultado
        })

    } catch (error) {
        console.error('Error al cambiar estado:', error.message)
        res.status(500).json({ error: 'Error interno al cambiar el estado.' })
    }
}

// ── BITÁCORA ─────────────────────────────────────────────────────────────────

const obtenerBitacora = async (req, res) => {
    try {
        const { id } = req.params

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'ID de propuesta inválido.' })
        }

        const bitacora = await Propuesta.obtenerBitacora(parseInt(id))
        res.json(bitacora)

    } catch (error) {
        console.error('Error al obtener bitácora:', error.message)
        res.status(500).json({ error: 'Error interno al obtener la bitácora.' })
    }
}

module.exports = {
    obtenerCatalogosPropuesta,
    obtenerTodas,
    obtenerPorId,
    crearPropuesta,
    guardarBorrador,
    validarYPresentar,
    cambiarEstado,
    obtenerBitacora
}
