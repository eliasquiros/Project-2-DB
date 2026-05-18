// =============================================================================
// Modelo: Nombramiento.js
// Módulo 1: Gestión de Identidad y Roles
// Issue 14: Historial de Nombramientos
// =============================================================================

const {pool} = require('../config/db')

// Obtener todos los nombramientos históricos de un asambleísta 
const obtenerPorAsambleista = async (id_asambleista) => {
    const query = `
        SELECT
            n.id_nombramiento,
            n.fecha_inicio,
            n.fecha_fin,
            n.estado,
            cm_sector.nombre AS sector,
            cm_puesto.nombre AS puesto
        FROM nombramiento n
        JOIN catalogo_maestro cm_sector ON n.sector_id = cm_sector.id_item
        LEFT JOIN catalogo_maestro cm_puesto ON n.id_puesto = cm_puesto.id_item
        WHERE n.asambleista_id = $1
        ORDER BY n.fecha_inicio DESC
    `
    const resultado = await pool.query(query, [id_asambleista])
    return resultado.rows
}

// Validar traslape de nombramientos activos
const validarTraslape = async (id_asambleista, fecha_inicio, fecha_fin) => {
    const query = `
        SELECT id_nombramiento
        FROM nombramiento
        WHERE asambleista_id = $1
          AND estado = 'ACTIVO'
          AND (
              fecha_fin IS NULL
              OR (fecha_inicio <= $3 AND (fecha_fin IS NULL OR fecha_fin >= $2))
          )
    `
    const resultado = await pool.query(query, [id_asambleista, fecha_inicio, fecha_fin || '9999-12-31'])
    return resultado.rows.length > 0
}

// Insertar nombramiento nuevo
const crear = async (id_asambleista, sector_id, id_puesto, fecha_inicio, fecha_fin, id_usuario_registro) => {
    const query = `
        INSERT INTO nombramiento 
            (asambleista_id, sector_id, id_puesto, fecha_inicio, fecha_fin, estado, id_usuario_registro)
        VALUES 
            ($1, $2, $3, $4, $5, 'ACTIVO', $6)
        RETURNING *
    `
    const resultado = await pool.query(query, [
        id_asambleista,
        sector_id,
        id_puesto || null,
        fecha_inicio,
        fecha_fin || null,
        id_usuario_registro
    ])
    return resultado.rows[0]
}

const obtenerReglamentos = async () => {
    const query = `
        SELECT id_reglamento, nombre_normativa, sigla
        FROM reglamento
        ORDER BY nombre_normativa ASC
    `
    const resultado = await pool.query(query)
    return resultado.rows
}

// Convierte la lista plana que devuelve la CTE en un JSON anidado con hijos.
// Se ejecuta en JavaScript para no hacer una segunda consulta a la BD.
// Cada nodo queda con la forma: { ...datos, hijos: [...] }
const construirArbolAnidado = (filas) => {
    const mapa = {}
    const raices = []

    // Primera pasada: indexar todos los nodos por su id
    filas.forEach(fila => {
        mapa[fila.id_elemento] = { ...fila, hijos: [] }
    })

    // Segunda pasada: conectar cada nodo con su padre
    // Si no tiene padre va directo a raices (es el nivel más alto)
    filas.forEach(fila => {
        if (fila.id_elemento_padre == null) {
            raices.push(mapa[fila.id_elemento])
        } else {
            mapa[fila.id_elemento_padre].hijos.push(mapa[fila.id_elemento])
        }
    })

    return raices
}

// Genera el árbol recursivo completo de un reglamento usando una CTE recursiva.
// La CTE recorre la tabla elemento_normativo siguiendo la FK id_elemento_padre
// hasta agotar todos los niveles (Título > Capítulo > Artículo > Inciso > Sub-inciso).
// Solo incluye elementos vigentes (fecha_fin_vigencia IS NULL).
const generarArbolRecursivo = async (id_reglamento_raiz) => {
    const query = `
        WITH RECURSIVE arbol AS (

            -- CASO BASE: elementos raíz, es decir los que no tienen padre.
            -- Son el primer nivel del reglamento (normalmente Títulos).
            SELECT
                e.id_elemento,
                e.id_elemento_padre,
                e.numero_etiqueta,
                e.contenido_texto,
                e.orden,
                e.fecha_inicio_vigencia,
                e.fecha_fin_vigencia,
                cm.nombre   AS nivel,
                1           AS profundidad
            FROM elemento_normativo e
            JOIN catalogo_maestro cm 
                ON e.id_nivel_reglamento = cm.id_item
               AND cm.grupo_catalogo     = 'NIVEL_REGLAMENTO'
            WHERE e.id_reglamento      = $1
              AND e.id_elemento_padre  IS NULL
              AND e.fecha_fin_vigencia IS NULL
              AND e.id_estado_vigencia = (
                SELECT id_item FROM catalogo_maestro
                WHERE grupo_catalogo = 'ESTADO_VIGENCIA' AND nombre = 'Vigente'
                )

            UNION ALL

            -- CASO RECURSIVO: hijos de cada nodo del nivel anterior.
            -- Se repite hasta que no haya más hijos que procesar.
            SELECT
                hijo.id_elemento,
                hijo.id_elemento_padre,
                hijo.numero_etiqueta,
                hijo.contenido_texto,
                hijo.orden,
                hijo.fecha_inicio_vigencia,
                hijo.fecha_fin_vigencia,
                cm.nombre           AS nivel,
                padre.profundidad + 1
            FROM elemento_normativo hijo
            JOIN catalogo_maestro cm 
                ON hijo.id_nivel_reglamento = cm.id_item
               AND cm.grupo_catalogo        = 'NIVEL_REGLAMENTO'
            -- Conecta cada hijo con su padre usando la FK recursiva
            JOIN arbol padre 
                ON hijo.id_elemento_padre = padre.id_elemento
            WHERE hijo.fecha_fin_vigencia IS NULL
            AND hijo.id_estado_vigencia = (
                SELECT id_item FROM catalogo_maestro
                WHERE grupo_catalogo = 'ESTADO_VIGENCIA' AND nombre = 'Vigente'
                )

        )
        SELECT * FROM arbol
        ORDER BY profundidad, orden
    `
    const resultado = await pool.query(query, [id_reglamento_raiz])
    if (resultado.rows.length === 0) {
        throw new Error(`No se encontraron elementos para el reglamento ${id_reglamento_raiz}`)
    }
    // Convierte la lista plana en árbol anidado antes de enviarlo al controlador
    return construirArbolAnidado(resultado.rows)
}

module.exports = {
    obtenerPorAsambleista,
    validarTraslape,
    crear,
    obtenerReglamentos,
    generarArbolRecursivo
}