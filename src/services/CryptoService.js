// =============================================================================
// Servicio: CryptoService.js
// Módulo 5: Fe Pública y Certificación
// Issue 17: Motor de Generación de Certificaciones Legales con Validación de Seguridad
// Generación de hash SHA-256 para certificaciones
// =============================================================================

const crypto = require('crypto')

// Genera el hash SHA-256 del contenido del certificado
// Este hash garantiza que el documento no fue alterado después de emitirse
// Se guarda en certificacion_emitida.hash_seguridad (VARCHAR 64)
const generarHashVerificacion = (contenido) => {
    return crypto.createHash('sha256').update(contenido, 'utf8').digest('hex')
}

// Verifica si un hash dado coincide con el contenido proporcionado
// Útil para validar la autenticidad de una certificación emitida
const verificarHash = (contenido, hashGuardado) => {
    const hashGenerado = generarHashVerificacion(contenido)
    return hashGenerado === hashGuardado
}

module.exports = {
    generarHashVerificacion,
    verificarHash
}