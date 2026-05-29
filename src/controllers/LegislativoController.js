// =============================================================================
// Controlador: LegislativoController.js
// Módulo 2: Estructura Normativa y Recursividad
// Issue 15: Gestión de Reformas
// Módulo 3: Operatividad de Sesiones
// Issue 12: Motor de Votaciones
// =============================================================================

const Normativa = require('../models/Normativa')
const Catalogo  = require('../models/Catalogo')
const Votacion  = require('../models/Votacion')

// =============================================================================
// Módulo 3: Sesiones y Trámite Legislativo
// Issue 11: Control de quórum y sesiones plenarias
// =============================================================================

const Sesion = require('../models/Sesion')

// Devuelve todas las sesiones plenarias con conteo de presentes
const obtenerSesiones = async (req, res) => {
    try {
        const sesiones = await Sesion.obtenerTodas()
        res.json(sesiones)
    } catch (error) {
        console.error('Error al obtener sesiones:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

// Crea una nueva sesión plenaria
const crearSesion = async (req, res) => {
    try {
        const {
            numero_sesion,
            fecha,
            quorum_requerido,
            id_tipo_sesion,
            id_tipo_modalidad,
            link_acta
        } = req.body

        if (!numero_sesion || !fecha || !quorum_requerido || !id_tipo_sesion || !id_tipo_modalidad) {
            return res.status(400).json({
                error: 'Número de sesión, fecha, quórum, tipo y modalidad son obligatorios'
            })
        }

        if (quorum_requerido < 1) {
            return res.status(400).json({
                error: 'El quórum requerido debe ser mayor a 0'
            })
        }

        const nueva = await Sesion.crear(
            numero_sesion,
            fecha,
            quorum_requerido,
            id_tipo_sesion,
            id_tipo_modalidad,
            link_acta,
            req.usuario.id
        )

        res.status(201).json(nueva)
    } catch (error) {
        console.error('Error al crear sesión:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

// Devuelve el detalle de una sesión con su lista de asistencia
const obtenerSesionPorId = async (req, res) => {
    try {
        const { id } = req.params
        const sesion = await Sesion.obtenerPorId(id)

        if (!sesion) {
            return res.status(404).json({ error: 'Sesión no encontrada' })
        }

        res.json(sesion)
    } catch (error) {
        console.error('Error al obtener sesión:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

// Registra la asistencia de los asambleístas en una sesión
const registrarAsistencia = async (req, res) => {
    try {
        const { id } = req.params
        const { asistencias } = req.body

        if (!asistencias || !Array.isArray(asistencias) || asistencias.length === 0) {
            return res.status(400).json({
                error: 'Debe enviar al menos un registro de asistencia'
            })
        }

        const sesion = await Sesion.obtenerPorId(id)
        if (!sesion) {
            return res.status(404).json({ error: 'Sesión no encontrada' })
        }

        const resultado = await Sesion.registrarAsistencia(id, asistencias, req.usuario.id)

        // Después de registrar, devolvemos el estado del quórum actualizado
        const quorum = await Sesion.validarQuorum(id)

        res.json({
            mensaje: `Asistencia registrada para ${resultado.registros} asambleístas`,
            quorum
        })
    } catch (error) {
        console.error('Error al registrar asistencia:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

// Devuelve los tipos de sesión y modalidades para los formularios
const obtenerCatalogosSesion = async (req, res) => {
    try {
        const catalogos = await Sesion.obtenerCatalogos()
        res.json(catalogos)
    } catch (error) {
        console.error('Error al obtener catálogos:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

// ── QUÓRUM ───────────────────────────────────────────────────────────────────
// Issue 12: Valida si una sesión tiene el quórum mínimo legal antes de votar
// Llama a la función validar_quorum_legal(id_sesion) de la BD

const validarQuorum = async (req, res) => {
    try {
        const { id } = req.params

        if (!id) {
            return res.status(400).json({ error: 'El id de la sesión es inválido o no fue enviado.' })
        }

        const tieneQuorum = await Votacion.validarQuorumSesion(id)

        res.status(200).json({
            id_sesion: id,
            quorum_legal: tieneQuorum,
            mensaje: tieneQuorum
                ? 'La sesión tiene quórum legal para sesionar.'
                : 'La sesión NO tiene quórum legal. No se puede votar.'
        })

    } catch (error) {
        console.error('Error al validar quórum:', error.message)
        res.status(500).json({ error: 'Error interno al validar el quórum.' })
    }
}

// ── VOTACIONES ────────────────────────────────────────────────────────────────
// Issue 12: Registrar un voto (nominal o secreto)
// La Secretaría opera el sistema durante la sesión e ingresa los datos

const registrarVoto = async (req, res) => {
    try {
        const { id_resolucion, id_asambleista, decision, es_secreto } = req.body

        if (!id_resolucion || !decision) {
            return res.status(400).json({ error: 'El id de resolución y la decisión son obligatorios.' })
        }

        if (!['FAVOR', 'CONTRA', 'ABSTENCION'].includes(decision)) {
            return res.status(400).json({ error: 'La decisión debe ser FAVOR, CONTRA o ABSTENCION.' })
        }

        // Voto secreto: no se registra el asambleísta, solo la decisión
        if (es_secreto) {
            const voto = await Votacion.registrarVotoSecreto(id_resolucion, decision)
            return res.status(201).json({ mensaje: 'Voto secreto registrado.', voto })
        }

        // Voto nominal: la Secretaría ingresa el id_asambleista en el body
        if (!id_asambleista) {
            return res.status(400).json({ error: 'Para voto nominal, el id_asambleista es obligatorio.' })
        }

        // Verificar que no haya votado ya en esta resolución
        const yaVoto = await Votacion.yaVoto(id_resolucion, id_asambleista)
        if (yaVoto) {
            return res.status(400).json({ error: 'Este asambleísta ya registró su voto en esta resolución.' })
        }

        const voto = await Votacion.registrarVotoNominal(id_resolucion, id_asambleista, decision)
        res.status(201).json({ mensaje: 'Voto nominal registrado.', voto })

    } catch (error) {
        if (error.message.includes('QUORUM_INSUFICIENTE')) {
            return res.status(400).json({ error: 'No se puede votar: la sesión no tiene quórum legal.' })
        }
        console.error('Error al registrar voto:', error.message)
        res.status(500).json({ error: 'Error interno al registrar el voto.' })
    }
}

// Issue 12: Calcular el resultado final de una votación
const calcularResultado = async (req, res) => {
    try {
        const { id } = req.params
        const { tipo_mayoria } = req.query

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'El id de resolución es inválido o no fue enviado.' })
        }

        if (!tipo_mayoria || !['Simple', 'Calificada'].includes(tipo_mayoria)) {
            return res.status(400).json({ error: 'El tipo de mayoría debe ser Simple o Calificada.' })
        }

        const resultado = await Votacion.calcularResultado(parseInt(id), tipo_mayoria)
        res.status(200).json(resultado)

    } catch (error) {
        console.error('Error al calcular resultado:', error.message)
        res.status(500).json({ error: 'Error interno al calcular el resultado de la votación.' })
    }
}

// Issue 12: Obtener todos los votos de una resolución
const obtenerVotosResolucion = async (req, res) => {
    try {
        const { id } = req.params

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'El id de resolución es inválido o no fue enviado.' })
        }

        const votos = await Votacion.obtenerVotosPorResolucion(parseInt(id))
        res.status(200).json({ votos })

    } catch (error) {
        console.error('Error al obtener votos:', error.message)
        res.status(500).json({ error: 'Error interno al obtener los votos.' })
    }
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

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'El id del reglamento es inválido o no fue enviado' })
        }

        const arbol = await Normativa.generarArbolRecursivo(parseInt(id))
        res.json(arbol)
    } catch (error) {
        if (error.message.includes('No se encontraron elementos')) {
            return res.status(404).json({ error: error.message })
        }
        res.status(500).json({ error: error.message })
    }
}

const obtenerSectores = async (req, res) => {
    try {
        const sectores = await Catalogo.obtenerSectores()
        res.json(sectores)
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener sectores' })
    }
}

// Issue 7: Roles de comisión para el selector de la vista
const obtenerRolesComision = async (req, res) => {
    try {
        const roles = await Catalogo.obtenerRolesComision()
        res.json(roles)
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener roles de comisión' })
    }
}

const obtenerTiposComision = async (req, res) => {
    try {
        const tipos = await Catalogo.obtenerTiposComision()
        res.json(tipos)
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tipos de comisión' })
    }
}

module.exports = {
    obtenerReglamentos,
    obtenerArbol,
    obtenerSesiones,
    crearSesion,
    obtenerSesionPorId,
    validarQuorum,
    registrarAsistencia,
    obtenerCatalogosSesion,
    registrarVoto,
    calcularResultado,
    obtenerVotosResolucion,
    aplicarReforma,
    obtenerHistorialReformas,
    obtenerSectores,
    obtenerRolesComision,
    obtenerTiposComision
}