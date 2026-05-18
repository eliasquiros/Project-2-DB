// Verifica el token en cada request protegido y expone el usuario
// en req.usuario para que los controladores lo usen directamente.
// Uso en routes.js: router.get('/ruta', verificarToken, Controlador.funcion)

const jwt = require('jsonwebtoken')
require('dotenv').config()

const verificarToken = (req, res, next) => {
    // El token llega en el header Authorization con formato: Bearer <token>
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' })
    }

    try {
        // Verifica y decodifica el token con la clave secreta del .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        // Deja el usuario decodificado disponible para el controlador
        req.usuario = decoded
        next()

    } catch (error) {
        return res.status(403).json({ error: 'Token inválido o expirado.' })
    }
}

module.exports = { verificarToken }