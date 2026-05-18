// =============================================================================
// Controlador: SecretariaController.js
// Módulo 1: Gestión de Identidad y Roles
// Issue 9: Catálogo de Asambleístas
// =============================================================================

const Asambleista = require('../models/Asambleista')
const { ejecutarConAuditoria } = require('../config/db')
const Nombramiento = require('../models/Nombramiento')

const obtenerTodos = async (req, res) => {
    try {
        const asambleistas = await Asambleista.obtenerTodos()
        res.json(asambleistas)
    } catch (error) {
        console.error('Error al obtener asambleístas:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

const obtenerPorId = async (req, res) => {
    try {
        const { id } = req.params
        const asambleista = await Asambleista.obtenerPorId(id)

        if (!asambleista) {
            return res.status(404).json({ error: 'Asambleísta no encontrado' })
        }

        res.json(asambleista)
    } catch (error) {
        console.error('Error al obtener asambleísta:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

const crear = async (req, res) => {
    try {
        const { cedula, nombre, correo_institucional } = req.body
        
        if (!cedula || !nombre) {
            return res.status(400).json({ error: 'La cédula y el nombre son obligatorios' })
        }

        const existente = await Asambleista.obtenerPorCedula(cedula)
        if (existente) {
            return res.status(400).json({ error: 'Ya existe un asambleísta con esa cédula' })
        }
        
        const resultado = await ejecutarConAuditoria(req.usuario.id, async (client) => {
            return Asambleista.crear(cedula, nombre, correo_institucional, client)
        })
        res.status(201).json(resultado.rows[0])
    } catch (error) {
        console.error('Error al crear asambleísta:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

const actualizar = async (req, res) => {
    try {
        const { id } = req.params
        const { cedula, nombre, correo_institucional, razon_cambio } = req.body

        if (!cedula || !nombre) {
            return res.status(400).json({ error: 'La cédula y el nombre son obligatorios' })
        }

        const existente = await Asambleista.obtenerPorId(id)
        if (!existente) {
            return res.status(404).json({ error: 'Asambleísta no encontrado' })
        }

        if (cedula !== existente.cedula) {
            const cedulaDuplicada = await Asambleista.obtenerPorCedula(cedula)
            if (cedulaDuplicada) {
                return res.status(400).json({ error: 'Ya existe un asambleísta con esa cédula' })
            }
        }

        const actualizado = await Asambleista.actualizar(id, cedula, nombre, correo_institucional, razon_cambio)
        res.json(actualizado)
    } catch (error) {
        console.error('Error al actualizar asambleísta:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

// =============================================================================
// Controlador: SecretariaController.js
// Módulo 1: Gestión de Identidad y Roles
// Issue 14: Historial de Nombramientos
// =============================================================================

const obtenerNombramientos = async (req, res) => {
    try {
        const { id } = req.params

        const asambleista = await Asambleista.obtenerPorId(id)
        if (!asambleista) {
            return res.status(404).json({ error: 'Asambleísta no encontrado' })
        }

        const nombramientos = await Nombramiento.obtenerPorAsambleista(id)
        res.json({
            asambleista,
            nombramientos
        })
    } catch (error) {
        console.error('Error al obtener nombramientos:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

const crearNombramiento = async (req, res) => {
    try {
        const { id } = req.params
        const { sector_id, id_puesto, fecha_inicio, fecha_fin, id_usuario_registro } = req.body

        if (!sector_id || !fecha_inicio) {
            return res.status(400).json({ error: 'El sector y la fecha de inicio son obligatorios' })
        }

        const asambleista = await Asambleista.obtenerPorId(id)
        if (!asambleista) {
            return res.status(404).json({ error: 'Asambleísta no encontrado' })
        }

        const hayTraslape = await Nombramiento.validarTraslape(id, fecha_inicio, fecha_fin)
        if (hayTraslape) {
            return res.status(400).json({ error: 'El asambleísta ya tiene un nombramiento activo en ese periodo' })
        }

        const nuevo = await Nombramiento.crear(id, sector_id, id_puesto, fecha_inicio, fecha_fin, id_usuario_registro)
        res.status(201).json(nuevo)
    } catch (error) {
        console.error('Error al crear nombramiento:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}



module.exports = {
    obtenerTodos,
    obtenerPorId,
    crear,
    actualizar,
    obtenerNombramientos,
    crearNombramiento
}