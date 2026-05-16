// =============================================================================
// Controlador: AuthController.js
// Módulo 1: Gestión de Identidad y Roles
// Issue 0: Seguridad RBAC
// =============================================================================

const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const Usuario = require('../models/Usuario')

const login = async (req, res) => {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' })
        }

        const usuario = await Usuario.obtenerPorUsername(username)
        if (!usuario) {
            return res.status(401).json({ error: 'Credenciales incorrectas' })
        }

        const passwordValida = await bcrypt.compare(password, usuario.password_hash)
        if (!passwordValida) {
            return res.status(401).json({ error: 'Credenciales incorrectas' })
        }

        const permisos = await Usuario.obtenerPermisos(usuario.id_usuario)

        const token = jwt.sign(
            { id: usuario.id_usuario, username: usuario.username, rol: usuario.rol, permisos },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        )

        res.json({ token, rol: usuario.rol })
    } catch (error) {
        console.error('Error en login:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

const logout = async (req, res) => {
    res.json({ mensaje: 'Sesión cerrada correctamente' })
}

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado, token requerido' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.usuario = decoded
        next()
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido o expirado' })
    }
}

module.exports = {
    login,
    logout,
    verificarToken
}