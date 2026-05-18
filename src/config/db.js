const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

pool.on('connect', () => {
  console.log(' Conexión exitosa a CockroachDB')
})

pool.on('error', (err) => {
  console.error(' Error en la conexión:', err.message)
})

// ── AUDITORÍA ─────────────────────────────────────────────────────────────────
// Ejecuta una operación dentro de una transacción identificada con el usuario
// activo de la aplicación. Cualquier trigger de auditoría puede leer el usuario
// con: current_setting('app.usuario_id', true)
// Uso: await ejecutarConAuditoria(id_usuario, async (client) => { ... })

const ejecutarConAuditoria = async (id_usuario, callback) => {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')

        // Pasa el id del usuario a la sesión de BD solo durante esta transacción
        await client.query(`SET LOCAL "app.usuario_id" = '${id_usuario}'`)

        // Ejecuta la operación real (INSERT, UPDATE, DELETE)
        const resultado = await callback(client)

        await client.query('COMMIT')
        return resultado

    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

module.exports = {pool, ejecutarConAuditoria }
