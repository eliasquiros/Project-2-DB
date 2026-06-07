// =============================================================================
// Modelo: Usuario.js
// Módulo 1: Gestión de Identidad y Roles
// Issue 0: Seguridad RBAC
// =============================================================================

const { pool } = require('../config/db')

// Buscar usuario por username y obtener su rol
const obtenerPorUsername = async (username) => {
    const query = `
        SELECT
            u.id_usuario,
            u.username,
            u.password_hash,
            u.email,
            u.activo,
            r.nombre_rol AS rol
        FROM sys_usuario u
        JOIN sys_usuario_rol ur ON u.id_usuario = ur.id_usuario
        JOIN sys_rol r ON ur.id_rol = r.id_rol
        WHERE u.username = $1
          AND u.activo = true
    `
    const resultado = await pool.query(query, [username])
    return resultado.rows[0]
}

// Obtener la lista de permisos de un usuario
const obtenerPermisos = async (id_usuario) => {
    const query = `
        SELECT DISTINCT
            p.nombre_permiso
        FROM sys_permiso p
        JOIN sys_rol_permiso rp ON p.id_permiso = rp.id_permiso
        JOIN sys_usuario_rol ur ON rp.id_rol = ur.id_rol
        WHERE ur.id_usuario = $1
    `
    const resultado = await pool.query(query, [id_usuario])
    return resultado.rows.map(p => p.nombre_permiso)
}

module.exports = {
    obtenerPorUsername,
    obtenerPermisos
}