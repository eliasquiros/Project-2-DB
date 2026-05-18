// =============================================================================
// Controlador: LegislativoController.js
// Módulo 2: Estructura Normativa y Recursividad
// Issue 15: Gestión de Reformas
// =============================================================================

const Normativa = require('../models/Normativa');
// const pool = require('../config/db')        revisar porque el controlador no puede acceder a pool directamente (viola MVC)

const Catalogo = require('../models/Catalogo');

const obtenerSesiones = async (req, res) => {
    res.json({ mensaje: 'LegislativoController - obtenerSesiones OK' })
}

const crearSesion = async (req, res) => {
    res.json({ mensaje: 'LegislativoController - crearSesion OK' })
}

const validarQuorum = async (req, res) => {
    res.json({ mensaje: 'LegislativoController - validarQuorum OK' })
}

const registrarVoto = async (req, res) => {
    res.json({ mensaje: 'LegislativoController - registrarVoto OK' })
}

const calcularResultado = async (req, res) => {
    res.json({ mensaje: 'LegislativoController - calcularResultado OK' })
}

// ── REFORMAS ─────────────────────────────────────────────────────────────────

const aplicarReforma = async (req, res) => {
    try {
        const { id_resolucion, id_elemento_normativo, id_tipo_reforma, texto_anterior, texto_nuevo, fecha_inicio_vigencia } = req.body

        if (!id_resolucion || !id_elemento_normativo || !id_tipo_reforma || !texto_nuevo || !fecha_inicio_vigencia) {
            return res.status(400).json({ error: 'Faltan campos obligatorios para registrar la reforma.' })
        }

        const reforma = await Normativa.insertarReforma(
            id_resolucion,
            id_elemento_normativo,
            id_tipo_reforma,
            texto_anterior,
            texto_nuevo,
            fecha_inicio_vigencia
        )

        res.status(201).json({ mensaje: 'Reforma registrada exitosamente.', reforma })

    } catch (error) {
        console.error('Error al aplicar reforma:', error.message)
        res.status(500).json({ error: 'Error interno al registrar la reforma.' })
    }
}

const obtenerHistorialReformas = async (req, res) => {
    try {
        const { id } = req.params

        if (!id) {
            return res.status(400).json({ error: 'Se requiere el ID del elemento normativo.' })
        }

        const historial = await Normativa.obtenerHistorialReformas(id)
        res.status(200).json({ historial })

    } catch (error) {
        console.error('Error al obtener historial:', error.message)
        res.status(500).json({ error: 'Error interno al obtener el historial de reformas.' })
    }
}
// Issue 10 — obtener lista de reglamentos para el selector de la vista
const obtenerReglamentos = async (req, res) => {
    try {
        const reglamentos = await Normativa.obtenerReglamentos()
        res.json(reglamentos)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

// Issue 10 — obtener árbol recursivo completo de un reglamento
const obtenerArbol = async (req, res) => {
    try {
        const { id } = req.params

        // Validar que el id existe y es numérico
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'El id del reglamento es inválido o no fue enviado' })
        }

        const arbol = await Normativa.generarArbolRecursivo(parseInt(id))
        res.json(arbol)
    } catch (error) {
        // Si el modelo lanzó el error de reglamento no encontrado lo diferenciamos
        if (error.message.includes('No se encontraron elementos')) {
            return res.status(404).json({ error: error.message })
        }
        res.status(500).json({ error: error.message })
    }
}

const obtenerSectores = async (req, res) => {
    try {
        const sectores = await Catalogo.obtenerSectores();
        res.json(sectores);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener sectores' });
    }
};

module.exports = {
    obtenerReglamentos,
    obtenerArbol,
    obtenerSesiones,
    crearSesion,
    validarQuorum,
    registrarVoto,
    calcularResultado,
    aplicarReforma,
    obtenerHistorialReformas,
    obtenerSectores,
}

