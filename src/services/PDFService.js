// =============================================================================
// Servicio: PDFService.js
// Módulo 5: Fe Pública y Certificación
// Issue 17: Motor de Generación de Certificaciones Legales con Validación de Seguridad
// Generación del PDF oficial de certificación AIR
// =============================================================================

const PDFDocument = require('pdfkit')
const { generarHashVerificacion } = require('./CryptoService')

// Issue 8: Convierte números a letras en español para el formato legal del PDF
const numeroALetras = (n) => {
    const unidades = ['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve',
                      'diez','once','doce','trece','catorce','quince','dieciséis','diecisiete',
                      'dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés',
                      'veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve']
    const decenas  = ['','','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa']

    if (n < 30) return unidades[n]
    const d = Math.floor(n / 10)
    const u = n % 10
    if (u === 0) return decenas[d]
    return `${decenas[d]} y ${unidades[u]}`
}

// Genera el PDF oficial de la certificación
// Recibe el objeto completo de datos del asambleísta y sus participaciones
const generarCertificacionPDF = (datos) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'LETTER',
            margin: 60
        })

        const buffers = []
        doc.on('data', chunk => buffers.push(chunk))
        doc.on('error', reject)
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers)
            const hash = generarHashVerificacion(pdfBuffer.toString('base64'))
            resolve({ pdfBuffer, hash })
        })

        // ── ENCABEZADO INSTITUCIONAL ──────────────────────────────────────
        doc.fontSize(13)
           .font('Helvetica-Bold')
           .text('INSTITUTO TECNOLÓGICO DE COSTA RICA', { align: 'center' })

        doc.fontSize(11)
           .font('Helvetica')
           .text('Asamblea Institucional Representativa', { align: 'center' })
           .text('Directorio de la AIR', { align: 'center' })

        doc.moveDown(0.5)

        // Folio en esquina derecha
        doc.fontSize(9)
           .text(`Folio: ${datos.folio_unico}`, { align: 'right' })

        doc.moveDown(0.5)

        // Línea separadora
        doc.moveTo(60, doc.y)
           .lineTo(550, doc.y)
           .stroke()

        doc.moveDown(1)

        // ── ACREDITACIÓN DE AUTORIDAD ─────────────────────────────────────
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('EL PRESIDENTE DEL DIRECTORIO DE LA ASAMBLEA INSTITUCIONAL REPRESENTATIVA')

        doc.moveDown(0.5)

        doc.font('Helvetica')
           .text('HACE CONSTAR QUE:')

        doc.moveDown(0.5)

        doc.text(
            `${datos.nombre}, portador(a) de la cédula de identidad número ${datos.cedula}, ` +
            `ha participado en las actividades de la Asamblea Institucional Representativa ` +
            `del Instituto Tecnológico de Costa Rica en los términos que se detallan a continuación.`,
            { align: 'justify' }
        )

        doc.moveDown(1)

        // ── REPRESENTACIÓN Y NOMBRAMIENTO ─────────────────────────────────
        doc.font('Helvetica-Bold').text('I. REPRESENTACIÓN')
        doc.moveDown(0.3)

        doc.font('Helvetica')
           .text(`Sector: ${datos.sector || 'No especificado'}`)
           .text(`Puesto: ${datos.puesto || 'No especificado'}`)

        const fechaInicio = datos.nombramiento_inicio
            ? new Date(datos.nombramiento_inicio).toLocaleDateString('es-CR')
            : 'No especificada'
        const fechaFin = datos.nombramiento_fin
            ? new Date(datos.nombramiento_fin).toLocaleDateString('es-CR')
            : 'Vigente'

        doc.text(`Período: ${fechaInicio} — ${fechaFin}`)
        doc.text(`Estado del nombramiento: ${datos.nombramiento_estado || 'ACTIVO'}`)

        doc.moveDown(1)

        // ── ASISTENCIA A SESIONES PLENARIAS ───────────────────────────────
        doc.font('Helvetica-Bold').text('II. PARTICIPACIÓN EN SESIONES PLENARIAS')
        doc.moveDown(0.3)

        if (datos.asistencia && datos.asistencia.sesiones_totales > 0) {
            const asistidas = numeroALetras(datos.asistencia.sesiones_asistidas)
            const totales   = numeroALetras(datos.asistencia.sesiones_totales)
            const porcentaje = datos.asistencia.porcentaje == 100
                ? 'el cien por ciento'
                : `un ${datos.asistencia.porcentaje}%`

            doc.font('Helvetica').text(
                `La persona indicada participó en ${asistidas} (${datos.asistencia.sesiones_asistidas}) ` +
                `de las ${totales} (${datos.asistencia.sesiones_totales}) sesiones plenarias convocadas ` +
                `en el período, lo que representa ${porcentaje} de asistencia. ` +
                `Lo anterior según los registros de asistencia de la Secretaría de la AIR.`,
                { align: 'justify' }
            )
        }

        doc.moveDown(1)

        // ── PARTICIPACIONES EN PROPUESTAS Y COMISIONES ────────────────────
        doc.font('Helvetica-Bold').text('III. PARTICIPACIÓN EN PROPUESTAS Y COMISIONES')
        doc.moveDown(0.3)

        if (!datos.participaciones || datos.participaciones.length === 0) {
            doc.font('Helvetica').text(
                'No se registran participaciones en propuestas o comisiones en el período indicado.'
            )
        } else {
            datos.participaciones.forEach((p, i) => {
                // Verificar si hay espacio suficiente en la página
                if (doc.y > 680) doc.addPage()

                doc.font('Helvetica-Bold')
                   .fontSize(9)
                   .text(`${i + 1}. ${p.propuesta_titulo || 'Sin título'} (${p.codigo_air || 'Sin código'})`)

                doc.font('Helvetica').fontSize(9)

                if (p.tipo_participacion === 'PROPONENTE') {
                    doc.text(`   Tipo de participación: Proponente`)
                } else {
                    doc.text(`   Tipo de participación: Integrante de comisión`)
                }

                doc.text(`   Etapa: ${p.etapa_propuesta || '—'} | Estado: ${p.estado_propuesta || '—'}`)

                if (p.numero_resolucion) {
                    doc.text(`   Resolución: ${p.numero_resolucion}`)
                }

                if (p.fecha_sesion) {
                    const fechaSesion = new Date(p.fecha_sesion).toLocaleDateString('es-CR')
                    doc.text(`   Sesión: ${p.numero_sesion || '—'} del ${fechaSesion}`)
                }

                // Nota condicional si aplica
                if (p.nota_condicional) {
                    doc.fontSize(8)
                       .font('Helvetica-Oblique')
                       .text(`   Nota: ${p.nota_condicional}`)
                       .fontSize(9)
                       .font('Helvetica')
                }

                doc.moveDown(0.5)
            })
        }

        doc.moveDown(1)

        // ── CIERRE LEGAL ──────────────────────────────────────────────────
        if (doc.y > 650) doc.addPage()

        doc.moveTo(60, doc.y)
           .lineTo(550, doc.y)
           .stroke()

        doc.moveDown(0.5)

        const fechaEmision = new Date().toLocaleDateString('es-CR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })

        doc.fontSize(9)
           .font('Helvetica')
           .text(
               `Se extiende la presente certificación a solicitud de la parte interesada, ` +
               `en el Campus Tecnológico Central Cartago, a los ${fechaEmision}. ` +
               `Esta certificación tiene carácter de declaración jurada de conformidad con ` +
               `el artículo 301 de la Ley General de la Administración Pública.`,
               { align: 'justify' }
           )

        doc.moveDown(2)

        // Espacio para firma
        doc.text('___________________________________', { align: 'center' })
        doc.text('Presidente del Directorio AIR', { align: 'center' })
        doc.text('Asamblea Institucional Representativa', { align: 'center' })
        doc.text('Instituto Tecnológico de Costa Rica', { align: 'center' })

        doc.moveDown(1)

        // ── PIE DE PÁGINA CON HASH ────────────────────────────────────────
        doc.fontSize(7)
           .font('Helvetica')
           .text(
               `Verificación de autenticidad — Folio: ${datos.folio_unico}`,
               { align: 'center' }
           )
           .text(
               `Este documento puede verificarse presentando el folio ante la Secretaría de la AIR.`,
               { align: 'center' }
           )

        doc.end()
    })
}

module.exports = { generarCertificacionPDF }