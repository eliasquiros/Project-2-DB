const express = require('express')
const path = require('path')
require('dotenv').config()

const app = express()

// Middlewares base
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Servir archivos estáticos (las vistas HTML)
app.use(express.static(path.join(__dirname, 'src/views')))

// Rutas de la API
const routes = require('./src/config/routes')
app.use('/api', routes)

// Ruta raíz — redirige al login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/views/auth/login.view.html'))
})

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

// Iniciar servidor
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`)
})