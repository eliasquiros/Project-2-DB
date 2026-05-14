const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

pool.on('connect', () => {
  console.log('✅ Conexión exitosa a CockroachDB')
})

pool.on('error', (err) => {
  console.error('❌ Error en la conexión:', err.message)
})

module.exports = pool