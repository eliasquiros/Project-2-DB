const express = require('express')
const router = express.Router()

// Importar controladores
const AuthController = require('../controllers/AuthController')
const SecretariaController = require('../controllers/SecretariaController')
const LegislativoController = require('../controllers/LegislativoController')
const ReporteController = require('../controllers/ReporteController')
const { verificarToken } = require('./middleware')
const ComisionController = require('../controllers/ComisionController')
const PropuestaController = require('../controllers/PropuestaController')
const UsuarioController = require('../controllers/UsuarioController')

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
router.get('/elementos/:id/trazabilidad', verificarToken, LegislativoController.obtenerTrazabilidad)
router.get('/catalogos/sectores', verificarToken, LegislativoController.obtenerSectores)
router.get('/catalogos/roles-comision', verificarToken, LegislativoController.obtenerRolesComision)
router.get('/catalogos/tipos-comision', verificarToken, LegislativoController.obtenerTiposComision)
router.get('/catalogos/estados-asistencia', verificarToken, LegislativoController.obtenerEstadosAsistencia)

// ── REFORMAS ──────────────────────────────────────────────
router.post('/reformas', verificarToken, LegislativoController.aplicarReforma)
router.get('/reformas/:id/historial', verificarToken, LegislativoController.obtenerHistorialReformas)

// ── PROPUESTAS DE REFORMA ─────────────────────────────────
router.get('/propuestas/catalogos',    verificarToken, PropuestaController.obtenerCatalogosPropuesta)
router.get('/propuestas',              verificarToken, PropuestaController.obtenerTodas)
router.get('/propuestas/:id',          verificarToken, PropuestaController.obtenerPorId)
router.post('/propuestas',             verificarToken, PropuestaController.crearPropuesta)
router.post('/propuestas/borrador',    verificarToken, PropuestaController.guardarBorrador)
router.post('/propuestas/presentar',   verificarToken, PropuestaController.validarYPresentar)
router.put('/propuestas/:id/estado',   verificarToken, PropuestaController.cambiarEstado)
router.get('/propuestas/:id/bitacora', verificarToken, PropuestaController.obtenerBitacora)

// ── SESIONES ──────────────────────────────────────
router.get('/sesiones', verificarToken, LegislativoController.obtenerSesiones)
router.get('/sesiones/catalogos', verificarToken, LegislativoController.obtenerCatalogosSesion)
router.post('/sesiones', verificarToken, LegislativoController.crearSesion)
router.get('/sesiones/:id', verificarToken, LegislativoController.obtenerSesionPorId)
router.get('/sesiones/:id/quorum', verificarToken, LegislativoController.validarQuorum)
router.post('/sesiones/:id/asistencia', verificarToken, LegislativoController.registrarAsistencia)

// ── VOTACIONES ────────────────────────────────────
router.post('/votaciones', verificarToken, LegislativoController.registrarVoto)
router.get('/votaciones/:id/resultado', verificarToken, LegislativoController.calcularResultado)
router.get('/votaciones/:id/votos', verificarToken, LegislativoController.obtenerVotosResolucion)

// ── CERTIFICACIONES ───────────────────────────────
router.get('/certificaciones', verificarToken, ReporteController.obtenerHistorial)
router.post('/certificaciones/preview', verificarToken, ReporteController.previewCertificacion)
router.post('/certificaciones', verificarToken, ReporteController.generarCertificacion)
router.get('/certificaciones/:folio', verificarToken, ReporteController.obtenerPorFolio)
router.get('/certificaciones/:folio/reimprimir', verificarToken, ReporteController.reimprimirCertificacion)

// ── AUDITORÍA ─────────────────────────────────────
router.get('/auditoria/logs', verificarToken, ReporteController.obtenerLogs)
router.get('/auditoria/resumen', verificarToken, ReporteController.obtenerResumenAuditoria)
router.get('/auditoria/certificaciones-por-mes', verificarToken, ReporteController.obtenerCertificacionesPorMes)
router.get('/auditoria/asambleistas-consultados', verificarToken, ReporteController.obtenerAsambleistasConsultados)
router.get('/auditoria/tablas', verificarToken, ReporteController.obtenerTablasAuditadas)

// ── REPORTES ──────────────────────────────────────────────
router.get('/reportes/estadisticas', verificarToken, ReporteController.obtenerEstadisticas)
router.get('/reportes/exportar',     verificarToken, ReporteController.exportarExcel)

// ── NOTAS CONDICIONALES (Issue 6) ─────────────────────────────────────────────
router.get('/notas-condicionales', verificarToken, ReporteController.obtenerNotasCondicionales)
router.post('/notas-condicionales', verificarToken, ReporteController.crearNotaCondicional)
router.put('/notas-condicionales/:id', verificarToken, ReporteController.actualizarNotaCondicional)

// ── USUARIOS (solo ADMIN) ─────────────────────────────────────────────────
router.get('/usuarios', verificarToken, UsuarioController.obtenerTodos)
router.get('/usuarios/roles', verificarToken, UsuarioController.obtenerRoles)
router.post('/usuarios', verificarToken, UsuarioController.crear)
router.put('/usuarios/:id/estado', verificarToken, UsuarioController.cambiarEstado)
router.put('/usuarios/:id', verificarToken, UsuarioController.editar)
router.delete('/usuarios/:id', verificarToken, UsuarioController.eliminar)

module.exports = router