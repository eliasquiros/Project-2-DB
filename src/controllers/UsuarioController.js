// =============================================================================
// Controlador: UsuarioController.js
// Módulo 1: Gestión de Identidad y Roles
// Issue 0: Seguridad RBAC — Gestión de Usuarios (solo ADMIN)
// =============================================================================

const bcrypt = require('bcryptjs')
const Usuario = require('../models/Usuario')

// GET /api/usuarios — Listar todos los usuarios
const obtenerTodos = async (req, res) => {
    try {
        const usuarios = await Usuario.obtenerTodos()
        res.json(usuarios)
    } catch (error) {
        console.error('Error al obtener usuarios:', error.message)
        res.status(500).json({ error: 'Error al obtener usuarios' })
    }
}

// GET /api/usuarios/roles — Listar roles disponibles
const obtenerRoles = async (req, res) => {
    try {
        const roles = await Usuario.obtenerRoles()
        res.json(roles)
    } catch (error) {
        console.error('Error al obtener roles:', error.message)
        res.status(500).json({ error: 'Error al obtener roles' })
    }
}

// POST /api/usuarios — Crear usuario nuevo
const crear = async (req, res) => {
    try {
        const { username, password, email, id_rol } = req.body

        if (!username || !password || !email || !id_rol) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' })
        }

        const password_hash = await bcrypt.hash(password, 10)
        const id_usuario = await Usuario.crear(username, password_hash, email, id_rol)

        res.status(201).json({ mensaje: 'Usuario creado correctamente', id_usuario })
    } catch (error) {
        console.error('Error al crear usuario:', error.message)
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
            return res.status(400).json({ error: 'El username o email ya existe' })
        }
        res.status(500).json({ error: 'Error al crear usuario' })
    }
}

// PUT /api/usuarios/:id/estado — Activar o desactivar usuario
const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params
        const { activo } = req.body

        if (activo === undefined) {
            return res.status(400).json({ error: 'El campo activo es obligatorio' })
        }

        await Usuario.cambiarEstado(id, activo)
        res.json({ mensaje: `Usuario ${activo ? 'activado' : 'desactivado'} correctamente` })
    } catch (error) {
        console.error('Error al cambiar estado:', error.message)
        res.status(500).json({ error: 'Error al cambiar estado del usuario' })
    }
}

module.exports = {
    obtenerTodos,
    obtenerRoles,
    crear,
    cambiarEstado
}