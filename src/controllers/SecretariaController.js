module.exports = {
  obtenerTodos: async (req, res) => {
    res.json({ mensaje: 'SecretariaController - obtenerTodos OK' })
  },
  obtenerPorId: async (req, res) => {
    res.json({ mensaje: 'SecretariaController - obtenerPorId OK' })
  },
  crear: async (req, res) => {
    res.json({ mensaje: 'SecretariaController - crear OK' })
  },
  actualizar: async (req, res) => {
    res.json({ mensaje: 'SecretariaController - actualizar OK' })
  }
}