const XLSX = require('xlsx')

const generarExcelEstadisticas = (datos, anio) => {

    // Crea un libro de Excel vacío
    const libro = XLSX.utils.book_new()

    // ── HOJA 1: Certificaciones por mes ──────────────────────
    // Mapea los números de mes a nombres legibles
    const nombresMes = {
        1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
        5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
        9: 'Setiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
    }

    const datosMes = datos.porMes.map(fila => ({
        'Mes': nombresMes[fila.mes] || fila.mes,
        'Total Certificaciones': parseInt(fila.total_certificaciones)
    }))

    const hojaMes = XLSX.utils.json_to_sheet(datosMes)
    XLSX.utils.book_append_sheet(libro, hojaMes, `Certificaciones ${anio}`)

    // ── HOJA 2: Desglose por sector ───────────────────────────
    const datosSector = datos.porSector.map(fila => ({
        'Sector': fila.sector,
        'Total Nombramientos Activos': parseInt(fila.total_nombramientos)
    }))

    const hojaSector = XLSX.utils.json_to_sheet(datosSector)
    XLSX.utils.book_append_sheet(libro, hojaSector, 'Desglose por Sector')

    // ── HOJA 3: Folios por año ────────────────────────────────
    const datosFolios = [{
        'Año': datos.folios.anio,
        'Total Folios Emitidos': parseInt(datos.folios.total_folios)
    }]

    const hojaFolios = XLSX.utils.json_to_sheet(datosFolios)
    XLSX.utils.book_append_sheet(libro, hojaFolios, 'Folios por Año')

    // Convierte el libro a buffer para enviarlo como descarga
    return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' })
}
module.exports = {
    generarExcelEstadisticas
}