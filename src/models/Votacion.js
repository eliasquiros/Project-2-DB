// =============================================================================
// Modelo: Votacion.js
// Módulo 3: Operatividad de Sesiones
// Issue 12: Motor de Votaciones
// =============================================================================

const { pool } = require('../config/db')

// Validar si una sesión tiene quórum legal
// Llama a la función validar_quorum_legal(id_sesion) ya definida en la BD
const validarQuorumSesion = async (id_sesion) => {
    const query = `SELECT validar_quorum_legal($1::INT) AS tiene_quorum`
    const resultado = await pool.query(query, [id_sesion])
    return resultado.rows[0].tiene_quorum
}

// Registrar un voto nominal (se guarda con id_asambleista)
// Un asambleísta solo puede votar una vez por resolución (UNIQUE constraint en BD)
const registrarVotoNominal = async (id_resolucion, id_asambleista, decision) => {
    const query = `
        INSERT INTO voto (id_resolucion, id_asambleista, decision, es_secreto)
        VALUES ($1, $2, $3, FALSE)
        RETURNING *
    `
    const resultado = await pool.query(query, [id_resolucion, id_asambleista, decision])
    return resultado.rows[0]
}

// Registrar votos secretos (no se guarda id_asambleista, solo la decisión)
// Se inserta una fila por cada voto: favor, contra o abstención
const registrarVotoSecreto = async (id_resolucion, decision) => {
    const query = `
        INSERT INTO voto (id_resolucion, id_asambleista, decision, es_secreto)
        VALUES ($1, NULL, $2, TRUE)
        RETURNING *
    `
    const resultado = await pool.query(query, [id_resolucion, decision])
    return resultado.rows[0]
}

// Obtener todos los votos de una resolución
const obtenerVotosPorResolucion = async (id_resolucion) => {
    const query = `
        SELECT
            v.id_voto,
            v.decision,
            v.es_secreto,
            v.fecha_registro,
            a.nombre    AS nombre_asambleista,
            a.cedula    AS cedula_asambleista
        FROM voto v
        LEFT JOIN asambleista a ON a.asambleista_id = v.id_asambleista
        WHERE v.id_resolucion = $1
        ORDER BY v.fecha_registro ASC
    `
    const resultado = await pool.query(query, [id_resolucion])
    return resultado.rows
}

// Calcular el resultado de una votación usando la función de BD
// Llama a calcular_resultado_votacion(votos_favor, votos_contra, tipo_mayoria)
const calcularResultado = async (id_resolucion, tipo_mayoria) => {
    const queryConteo = `
        SELECT
            COUNT(CASE WHEN decision = 'FAVOR'      THEN 1 END)::INT AS votos_favor,
            COUNT(CASE WHEN decision = 'CONTRA'     THEN 1 END)::INT AS votos_contra,
            COUNT(CASE WHEN decision = 'ABSTENCION' THEN 1 END)::INT AS abstenciones,
            COUNT(*)::INT                                             AS total_votos
        FROM voto
        WHERE id_resolucion = $1
    `
    const conteo = await pool.query(queryConteo, [id_resolucion])
    const { votos_favor, votos_contra, abstenciones, total_votos } = conteo.rows[0]

    const queryResultado = `
        SELECT calcular_resultado_votacion($1, $2, $3) AS resultado
    `
    const resultado = await pool.query(queryResultado, [votos_favor, votos_contra, tipo_mayoria])

    return {
        votos_favor,
        votos_contra,
        abstenciones,
        total_votos,
        tipo_mayoria,
        resultado: resultado.rows[0].resultado
    }
}

// Verificar si un asambleísta ya votó en una resolución (evitar doble voto)
const yaVoto = async (id_resolucion, id_asambleista) => {
    const query = `
        SELECT id_voto FROM voto
        WHERE id_resolucion  = $1
          AND id_asambleista = $2
    `
    const resultado = await pool.query(query, [id_resolucion, id_asambleista])
    return resultado.rows.length > 0
}

module.exports = {
    validarQuorumSesion,
    registrarVotoNominal,
    registrarVotoSecreto,
    obtenerVotosPorResolucion,
    calcularResultado,
    yaVoto
}