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

// Obtener todos los usuarios con su rol
const obtenerTodos = async () => {
    const query = `
        SELECT
            u.id_usuario,
            u.username,
            u.email,
            u.activo,
            r.nombre_rol AS rol
        FROM sys_usuario u
        JOIN sys_usuario_rol ur ON u.id_usuario = ur.id_usuario
        JOIN sys_rol r ON ur.id_rol = r.id_rol
        ORDER BY u.username
    `
    const resultado = await pool.query(query)
    return resultado.rows
}

// Obtener todos los roles disponibles
const obtenerRoles = async () => {
    const query = `SELECT id_rol, nombre_rol FROM sys_rol ORDER BY nombre_rol`
    const resultado = await pool.query(query)
    return resultado.rows
}

// Crear usuario nuevo
const crear = async (username, password_hash, email, id_rol) => {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')

        const insertUsuario = `
            INSERT INTO sys_usuario (username, password_hash, email, activo)
            VALUES ($1, $2, $3, true)
            RETURNING id_usuario
        `
        const resultado = await client.query(insertUsuario, [username, password_hash, email])
        const id_usuario = resultado.rows[0].id_usuario

        const insertRol = `
            INSERT INTO sys_usuario_rol (id_usuario, id_rol)
            VALUES ($1, $2)
        `
        await client.query(insertRol, [id_usuario, id_rol])

        await client.query('COMMIT')
        return id_usuario
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

// Activar o desactivar usuario
const cambiarEstado = async (id_usuario, activo) => {
    const query = `
        UPDATE sys_usuario SET activo = $1 WHERE id_usuario = $2
    `
    await pool.query(query, [activo, id_usuario])
}

// Editar usuario (email y/o rol)
const editar = async (id_usuario, email, id_rol) => {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')

        if (email) {
            await client.query(
                'UPDATE sys_usuario SET email = $1 WHERE id_usuario = $2',
                [email, id_usuario]
            )
        }

        if (id_rol) {
            await client.query(
                'DELETE FROM sys_usuario_rol WHERE id_usuario = $1',
                [id_usuario]
            )
            await client.query(
                'INSERT INTO sys_usuario_rol (id_usuario, id_rol) VALUES ($1, $2)',
                [id_usuario, id_rol]
            )
        }

        await client.query('COMMIT')
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

// Eliminar usuario
const eliminar = async (id_usuario) => {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')
        await client.query('DELETE FROM sys_usuario_rol WHERE id_usuario = $1', [id_usuario])
        await client.query('DELETE FROM sys_usuario WHERE id_usuario = $1', [id_usuario])
        await client.query('COMMIT')
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

module.exports = {
    obtenerPorUsername,
    obtenerPermisos,
    obtenerTodos,
    obtenerRoles,
    crear,
    cambiarEstado,
    editar,
    eliminar
}