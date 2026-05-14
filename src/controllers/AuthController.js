module.exports = {
  login: async (req, res) => {
    res.json({ mensaje: 'AuthController - login OK' })
  },
  logout: async (req, res) => {
    res.json({ mensaje: 'AuthController - logout OK' })
  }
}
