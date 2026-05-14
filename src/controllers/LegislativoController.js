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
  }
}