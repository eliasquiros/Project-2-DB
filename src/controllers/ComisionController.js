// =============================================================================
// Controlador: ComisionController.js
// Módulo 4: Comisiones e Informes
// Issue 7: Gestión de comisiones y proponentes
// =============================================================================

const Comision = require('../models/Comision')
const Asambleista = require('../models/Asambleista')
const { ejecutarConAuditoria } = require('../config/db')

// Devuelve la lista de todas las comisiones con su tipo y total de integrantes
const obtenerTodas = async (req, res) => {
    try {
        const comisiones = await Comision.obtenerTodos()
        res.json(comisiones)
    } catch (error) {
        console.error('Error al obtener comisiones:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

// Devuelve el detalle de una comisión con sus integrantes activos
const obtenerPorId = async (req, res) => {
    try {
        const { id } = req.params
        const comision = await Comision.obtenerPorId(id)

        if (!comision) {
            return res.status(404).json({ error: 'Comisión no encontrada' })
        }

        res.json(comision)
    } catch (error) {
        console.error('Error al obtener comisión:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}


// Crea una nueva comisión
const crear = async (req, res) => {
    try {
        const { id_tipo_comision, nombre_comision } = req.body

        if (!id_tipo_comision || !nombre_comision) {
            return res.status(400).json({
                error: 'El tipo de comisión y el nombre son obligatorios'
            })
        }

        if (nombre_comision.trim().length < 5) {
            return res.status(400).json({
                error: 'El nombre de la comisión debe tener al menos 5 caracteres'
            })
        }

        const nueva = await ejecutarConAuditoria(req.usuario.id, async (client) => {
            return Comision.crear(id_tipo_comision, nombre_comision.trim(), client)
        })

        res.status(201).json(nueva)
    } catch (error) {
        console.error('Error al crear comisión:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

// Asigna un asambleísta a una comisión con un rol
const asignarIntegrante = async (req, res) => {
    try {
        const { id } = req.params
        const { id_asambleista, id_rol_comision, fecha_ingreso } = req.body

        if (!id_asambleista || !id_rol_comision || !fecha_ingreso) {
            return res.status(400).json({
                error: 'El asambleísta, el rol y la fecha de ingreso son obligatorios'
            })
        }

        // Verificar que la comisión existe
        const comision = await Comision.obtenerPorId(id)
        if (!comision) {
            return res.status(404).json({ error: 'Comisión no encontrada' })
        }

        // Verificar que el asambleísta existe
        const asambleista = await Asambleista.obtenerPorId(id_asambleista)
        if (!asambleista) {
            return res.status(404).json({ error: 'Asambleísta no encontrado' })
        }

        const integrante = await ejecutarConAuditoria(req.usuario.id, async (client) => {
            return Comision.asignarIntegrante(
                id,
                id_asambleista,
                id_rol_comision,
                fecha_ingreso,
                client
            )
        })

        res.status(201).json(integrante)
    } catch (error) {
        // Este error viene del modelo cuando el asambleísta ya es integrante activo
        if (error.message.includes('ya es integrante activo')) {
            return res.status(400).json({ error: error.message })
        }
        console.error('Error al asignar integrante:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

// Devuelve todas las sesiones internas de una comisión
const obtenerSesiones = async (req, res) => {
    try {
        const { id } = req.params

        const comision = await Comision.obtenerPorId(id)
        if (!comision) {
            return res.status(404).json({ error: 'Comisión no encontrada' })
        }

        const sesiones = await Comision.obtenerSesiones(id)
        res.json({
            comision: comision.nombre_comision,
            sesiones
        })
    } catch (error) {
        console.error('Error al obtener sesiones:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

// Registra una sesión interna con la asistencia de los integrantes
const registrarSesion = async (req, res) => {
    try {
        const { id } = req.params
        const { fecha_hora, lugar, asistencias } = req.body

        if (!fecha_hora) {
            return res.status(400).json({ error: 'La fecha y hora son obligatorias' })
        }

        if (!asistencias || !Array.isArray(asistencias) || asistencias.length === 0) {
            return res.status(400).json({
                error: 'Debe registrar la asistencia de al menos un integrante'
            })
        }

        // Verificar que la comisión existe
        const comision = await Comision.obtenerPorId(id)
        if (!comision) {
            return res.status(404).json({ error: 'Comisión no encontrada' })
        }

        const sesion = await Comision.registrarSesion(
            id,
            fecha_hora,
            lugar,
            asistencias,
            req.usuario.id
        )

        res.status(201).json({
            mensaje: 'Sesión registrada correctamente',
            sesion
        })
    } catch (error) {
        console.error('Error al registrar sesión:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

module.exports = {
    obtenerTodas,
    obtenerPorId,
    crear,
    asignarIntegrante,
    obtenerSesiones,
    registrarSesion
}