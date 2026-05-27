const express = require('express')
const router = express.Router()

// Importar controladores
const AuthController = require('../controllers/AuthController')
const SecretariaController = require('../controllers/SecretariaController')
const LegislativoController = require('../controllers/LegislativoController')
const ReporteController = require('../controllers/ReporteController')
const { verificarToken } = require('./middleware')
const ComisionController = require('../controllers/ComisionController')

// ── AUTH ──────────────────────────────────────────
router.post('/auth/login', AuthController.login)
router.post('/auth/logout', AuthController.logout)

// ── ASAMBLEÍSTAS ──────────────────────────────────
router.get('/asambleistas',verificarToken, SecretariaController.obtenerTodos)
router.get('/asambleistas/:id', verificarToken, SecretariaController.obtenerPorId)
router.post('/asambleistas', verificarToken, SecretariaController.crear)
router.put('/asambleistas/:id', verificarToken, SecretariaController.actualizar)

// ── NOMBRAMIENTOS ──────────────────────────────────
router.get('/asambleistas/:id/nombramientos', verificarToken, SecretariaController.obtenerNombramientos)
router.post('/asambleistas/:id/nombramientos', verificarToken, SecretariaController.crearNombramiento)

// ── COMISIONES ────────────────────────────────────
router.get('/comisiones', verificarToken, ComisionController.obtenerTodas)
router.get('/comisiones/:id', verificarToken, ComisionController.obtenerPorId)
router.post('/comisiones', verificarToken, ComisionController.crear)
router.post('/comisiones/:id/integrantes', verificarToken, ComisionController.asignarIntegrante)
router.get('/comisiones/:id/sesiones', verificarToken, ComisionController.obtenerSesiones)
router.post('/comisiones/:id/sesiones', verificarToken, ComisionController.registrarSesion)

// ── NORMATIVA ─────────────────────────────────────
router.get('/reglamentos',verificarToken, LegislativoController.obtenerReglamentos)
router.get('/reglamentos/:id/arbol', verificarToken, LegislativoController.obtenerArbol)
router.get('/catalogos/sectores', verificarToken, LegislativoController.obtenerSectores)
router.get('/catalogos/roles-comision', verificarToken, LegislativoController.obtenerRolesComision)
router.get('/catalogos/tipos-comision', verificarToken, LegislativoController.obtenerTiposComision)

// ── REFORMAS ──────────────────────────────────────────────
router.post('/reformas', verificarToken, LegislativoController.aplicarReforma)
router.get('/reformas/:id/historial', verificarToken, LegislativoController.obtenerHistorialReformas)


// ── SESIONES ──────────────────────────────────────
router.get('/sesiones', verificarToken, LegislativoController.obtenerSesiones)
router.post('/sesiones', verificarToken, LegislativoController.crearSesion)
router.get('/sesiones/:id/quorum', verificarToken, LegislativoController.validarQuorum)

// ── VOTACIONES ────────────────────────────────────
router.post('/votaciones', verificarToken, LegislativoController.registrarVoto)
router.get('/votaciones/:id/resultado', verificarToken, LegislativoController.calcularResultado)
router.get('/votaciones/:id/votos', verificarToken, LegislativoController.obtenerVotosResolucion)

// ── CERTIFICACIONES ───────────────────────────────
router.post('/certificaciones', verificarToken, ReporteController.generarCertificacion)
router.get('/certificaciones/:folio', verificarToken, ReporteController.obtenerPorFolio)

// ── AUDITORÍA ─────────────────────────────────────
router.get('/auditoria/logs', verificarToken, ReporteController.obtenerLogs)
router.get('/auditoria/resumen', verificarToken, ReporteController.obtenerResumenAuditoria)
router.get('/auditoria/certificaciones-por-mes', verificarToken, ReporteController.obtenerCertificacionesPorMes)
router.get('/auditoria/asambleistas-consultados', verificarToken, ReporteController.obtenerAsambleistasConsultados)
router.get('/auditoria/tablas', verificarToken, ReporteController.obtenerTablasAuditadas)

module.exports = router