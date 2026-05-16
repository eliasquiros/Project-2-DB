// =============================================================================
// Controlador: LegislativoController.js
// Módulo 2: Estructura Normativa y Recursividad
// Issue 15: Gestión de Reformas
// =============================================================================

const Normativa = require('../models/Normativa');
const pool = require('../config/db')

module.exports = {
    obtenerReglamentos: async (req, res) => {
        res.json({ mensaje: 'LegislativoController - obtenerReglamentos OK' })
    },

    obtenerArbol: async (req, res) => {
        res.json({ mensaje: 'LegislativoController - obtenerArbol OK' })
    },

    obtenerSesiones: async (req, res) => {
        res.json({ mensaje: 'LegislativoController - obtenerSesiones OK' })
    },

    crearSesion: async (req, res) => {
        res.json({ mensaje: 'LegislativoController - crearSesion OK' })
    },

    validarQuorum: async (req, res) => {
        res.json({ mensaje: 'LegislativoController - validarQuorum OK' })
    },

    registrarVoto: async (req, res) => {
        res.json({ mensaje: 'LegislativoController - registrarVoto OK' })
    },

    calcularResultado: async (req, res) => {
        res.json({ mensaje: 'LegislativoController - calcularResultado OK' })
    },

    // ── REFORMAS ──────────────────────────────────────────
    aplicarReforma: async (req, res) => {
        try {
            const { id_resolucion, id_elemento_normativo, id_tipo_reforma, texto_anterior, texto_nuevo, fecha_inicio_vigencia } = req.body;

            if (!id_resolucion || !id_elemento_normativo || !id_tipo_reforma || !texto_nuevo || !fecha_inicio_vigencia) {
                return res.status(400).json({ error: 'Faltan campos obligatorios para registrar la reforma.' });
            }

            const reforma = await Normativa.insertarReforma(
                id_resolucion,
                id_elemento_normativo,
                id_tipo_reforma,
                texto_anterior,
                texto_nuevo,
                fecha_inicio_vigencia
            );

            res.status(201).json({ mensaje: 'Reforma registrada exitosamente.', reforma });

        } catch (error) {
            console.error('Error al aplicar reforma:', error.message);
            res.status(500).json({ error: 'Error interno al registrar la reforma.' });
        }
    },

    obtenerHistorialReformas: async (req, res) => {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({ error: 'Se requiere el ID del elemento normativo.' });
            }

            const historial = await Normativa.obtenerHistorialReformas(id);
            res.status(200).json({ historial });

        } catch (error) {
            console.error('Error al obtener historial:', error.message);
            res.status(500).json({ error: 'Error interno al obtener el historial de reformas.' });
        }
    },
    
    obtenerSectores: async (req, res) => {
        try {
            const resultado = await pool.query(
                `SELECT id_item, nombre FROM catalogo_maestro 
                 WHERE grupo_catalogo = 'SECTOR' AND activo = true`
            )
            res.json(resultado.rows)
        } catch (error) {
            res.status(500).json({ error: 'Error al obtener sectores' })
        }
    }
};