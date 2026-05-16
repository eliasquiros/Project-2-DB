const express = require('express')
const router = express.Router()

// Importar controladores
const AuthController = require('../controllers/AuthController')
const SecretariaController = require('../controllers/SecretariaController')
const LegislativoController = require('../controllers/LegislativoController')
const ReporteController = require('../controllers/ReporteController')

// ── AUTH ──────────────────────────────────────────
router.post('/auth/login', AuthController.login)
router.post('/auth/logout', AuthController.logout)

// ── ASAMBLEÍSTAS ──────────────────────────────────
router.get('/asambleistas', SecretariaController.obtenerTodos)
router.get('/asambleistas/:id', SecretariaController.obtenerPorId)
router.post('/asambleistas', SecretariaController.crear)
router.put('/asambleistas/:id', SecretariaController.actualizar)

// ── NOMBRAMIENTOS ──────────────────────────────────
router.get('/asambleistas/:id/nombramientos', SecretariaController.obtenerNombramientos)
router.post('/asambleistas/:id/nombramientos', SecretariaController.crearNombramiento)

// ── NORMATIVA ─────────────────────────────────────
router.get('/reglamentos', LegislativoController.obtenerReglamentos)
router.get('/reglamentos/:id/arbol', LegislativoController.obtenerArbol)
router.get('/catalogos/sectores', LegislativoController.obtenerSectores)

// ── REFORMAS ──────────────────────────────────────────────
router.post('/reformas', LegislativoController.aplicarReforma)
router.get('/reformas/:id/historial', LegislativoController.obtenerHistorialReformas)

// ── REFORMAS ──────────────────────────────────────────────
router.post('/reformas', LegislativoController.aplicarReforma)
router.get('/reformas/:id/historial', LegislativoController.obtenerHistorialReformas)

// ── SESIONES ──────────────────────────────────────
router.get('/sesiones', LegislativoController.obtenerSesiones)
router.post('/sesiones', LegislativoController.crearSesion)
router.get('/sesiones/:id/quorum', LegislativoController.validarQuorum)

// ── VOTACIONES ────────────────────────────────────
router.post('/votaciones', LegislativoController.registrarVoto)
router.get('/votaciones/:id/resultado', LegislativoController.calcularResultado)

// ── CERTIFICACIONES ───────────────────────────────
router.post('/certificaciones', ReporteController.generarCertificacion)
router.get('/certificaciones/:folio', ReporteController.obtenerPorFolio)

module.exports = router