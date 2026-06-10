// =============================================================================
// Modelo: Normativa.js
// Módulo 2: Estructura Normativa y Recursividad
// Issue 15: Gestión de Reformas
// =============================================================================

const {pool} = require('../config/db');

// Insertar una reforma y registrar el cambio normativo
const insertarReforma = async (id_resolucion, id_elemento_normativo, id_tipo_reforma, texto_anterior, texto_nuevo, fecha_inicio_vigencia) => {
    const query = `
        INSERT INTO reforma_aplicada 
            (id_resolucion, id_elemento_normativo, id_tipo_reforma, texto_anterior, texto_nuevo, fecha_inicio_vigencia)
        VALUES 
            ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    `;
    const valores = [id_resolucion, id_elemento_normativo, id_tipo_reforma, texto_anterior, texto_nuevo, fecha_inicio_vigencia];
    const resultado = await pool.query(query, valores);
    return resultado.rows[0];
};

// Obtener el historial de reformas de un elemento normativo
const obtenerHistorialReformas = async (id_elemento_normativo) => {
    const query = `
        SELECT 
            r.id_reforma,
            r.texto_anterior,
            r.texto_nuevo,
            r.fecha_inicio_vigencia,
            cm.nombre AS tipo_reforma,
            res.numero_resolucion,
            res.fecha_emision
        FROM reforma_aplicada r
        JOIN catalogo_maestro cm ON r.id_tipo_reforma = cm.id_item
        JOIN resolucion res      ON r.id_resolucion   = res.id_resolucion
        WHERE r.id_elemento_normativo = $1
        ORDER BY r.fecha_inicio_vigencia DESC;
    `;
    const resultado = await pool.query(query, [id_elemento_normativo]);
    return resultado.rows;
};

// Obtener lista de reglamentos para el selector
const obtenerReglamentos = async () => {
    const query = `
        SELECT id_reglamento, nombre_normativa, sigla
        FROM reglamento
        ORDER BY nombre_normativa ASC
    `
    const resultado = await pool.query(query)
    return resultado.rows
}

// Construye árbol anidado desde lista plana
const construirArbolAnidado = (filas) => {
    const mapa = {}
    const raices = []
    filas.forEach(fila => { mapa[fila.id_elemento] = { ...fila, hijos: [] } })
    filas.forEach(fila => {
        if (fila.id_elemento_padre == null) {
            raices.push(mapa[fila.id_elemento])
        } else if (mapa[fila.id_elemento_padre]) {
            mapa[fila.id_elemento_padre].hijos.push(mapa[fila.id_elemento])
        }
    })

    const ordenarPorSecuenciaNormativa = (nodos) => {
        nodos.sort((a, b) => (a.orden || 0) - (b.orden || 0))
        nodos.forEach(nodo => ordenarPorSecuenciaNormativa(nodo.hijos))
        return nodos
    }

    return ordenarPorSecuenciaNormativa(raices)
}

// Genera árbol recursivo completo de un reglamento
const generarArbolRecursivo = async (id_reglamento_raiz) => {
    const query = `
        WITH RECURSIVE arbol AS (
            SELECT e.id_elemento, e.id_elemento_padre, e.numero_etiqueta,
                   e.contenido_texto, e.orden, e.fecha_inicio_vigencia,
                   e.fecha_fin_vigencia, cm.nombre AS nivel, 1 AS profundidad
            FROM elemento_normativo e
            JOIN catalogo_maestro cm ON e.id_nivel_reglamento = cm.id_item
                AND cm.grupo_catalogo = 'NIVEL_REGLAMENTO'
            WHERE e.id_reglamento = $1
              AND e.id_elemento_padre IS NULL
              AND e.fecha_fin_vigencia IS NULL
              AND e.id_estado_vigencia = (
                SELECT id_item FROM catalogo_maestro
                WHERE grupo_catalogo = 'ESTADO_VIGENCIA' AND nombre = 'Vigente'
              )
            UNION ALL
            SELECT hijo.id_elemento, hijo.id_elemento_padre, hijo.numero_etiqueta,
                   hijo.contenido_texto, hijo.orden, hijo.fecha_inicio_vigencia,
                   hijo.fecha_fin_vigencia, cm.nombre AS nivel, padre.profundidad + 1
            FROM elemento_normativo hijo
            JOIN catalogo_maestro cm ON hijo.id_nivel_reglamento = cm.id_item
                AND cm.grupo_catalogo = 'NIVEL_REGLAMENTO'
            JOIN arbol padre ON hijo.id_elemento_padre = padre.id_elemento
            WHERE hijo.fecha_fin_vigencia IS NULL
              AND hijo.id_estado_vigencia = (
                SELECT id_item FROM catalogo_maestro
                WHERE grupo_catalogo = 'ESTADO_VIGENCIA' AND nombre = 'Vigente'
              )
        )
        SELECT * FROM arbol ORDER BY profundidad, orden
    `
    const resultado = await pool.query(query, [id_reglamento_raiz])
    if (resultado.rows.length === 0) {
        throw new Error(`No se encontraron elementos para el reglamento ${id_reglamento_raiz}`)
    }
    return construirArbolAnidado(resultado.rows)
}

const obtenerTrazabilidad = async (id_elemento) => {
    const query = `
        SELECT
            -- Estado de vigencia del elemento actual
            cm.nombre AS estado_vigencia,

            -- Acuerdo de la reforma más reciente aplicada
            r.numero_resolucion AS acuerdo,

            -- Fecha exacta de la sesión donde se aprobó
            s.fecha AS fecha_sesion
        FROM elemento_normativo e
            JOIN catalogo_maestro cm
                ON e.id_estado_vigencia = cm.id_item
            LEFT JOIN reforma_aplicada ra
                ON ra.id_elemento_normativo = e.id_elemento
            LEFT JOIN resolucion r
                ON ra.id_resolucion = r.id_resolucion
            LEFT JOIN sesiones s
                ON r.id_sesion = s.id_sesion
            WHERE e.id_elemento = $1::bigint
        
            LIMIT 1
    `
    const resultado = await pool.query(query, [id_elemento])

    if (resultado.rows.length === 0) {
        throw new Error(`No se encontró el elemento normativo con id ${id_elemento}`)
    }

    return resultado.rows[0]
}
module.exports = {
    insertarReforma,
    obtenerHistorialReformas,
    obtenerReglamentos,
    generarArbolRecursivo,
    obtenerTrazabilidad
};
