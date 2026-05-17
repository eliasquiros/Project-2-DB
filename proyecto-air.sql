-- =============================================================================

-- Bases de datos - Proyecto 2 - Sistema AIR TEC
-- PostgreSQL - CockroachDB
-- Sprint 2 - Semana 1
-- Borrador de tablas críticas
-- Issues #0, #9, #10, #14, #15

-- =============================================================================

-- Limpieza pgAdmin

DROP TABLE IF EXISTS reforma_aplicada             CASCADE;
DROP TABLE IF EXISTS anulacion_certificacion      CASCADE;
DROP TABLE IF EXISTS certificacion_emitida        CASCADE;
DROP TABLE IF EXISTS control_folio                CASCADE;
DROP TABLE IF EXISTS asistencia_sesion_comision   CASCADE;
DROP TABLE IF EXISTS justificaciones_por_informe  CASCADE;
DROP TABLE IF EXISTS informe_directorio           CASCADE;
DROP TABLE IF EXISTS justificacion_legal          CASCADE;
DROP TABLE IF EXISTS punto_agenda_sesion_comision CASCADE;
DROP TABLE IF EXISTS sesion_comision              CASCADE;
DROP TABLE IF EXISTS bitacora_integrante_comision CASCADE;
DROP TABLE IF EXISTS integrante_comision          CASCADE;
DROP TABLE IF EXISTS propositos_comision          CASCADE;
DROP TABLE IF EXISTS comision                     CASCADE;
DROP TABLE IF EXISTS nombramiento                 CASCADE;
DROP TABLE IF EXISTS asistencia_sesion_plenaria   CASCADE;
DROP TABLE IF EXISTS resolucion                   CASCADE;
DROP TABLE IF EXISTS punto_agenda                 CASCADE;
DROP TABLE IF EXISTS proponente_propuesta         CASCADE;
DROP TABLE IF EXISTS bitacora_propuesta           CASCADE;
DROP TABLE IF EXISTS propuesta                    CASCADE;
DROP TABLE IF EXISTS acta                         CASCADE;
DROP TABLE IF EXISTS sesiones                     CASCADE;
DROP TABLE IF EXISTS elemento_normativo           CASCADE;
DROP TABLE IF EXISTS reglamento                   CASCADE;
DROP TABLE IF EXISTS bitacora_asambleistas        CASCADE;
DROP TABLE IF EXISTS asambleista                  CASCADE;
DROP TABLE IF EXISTS catalogo_maestro             CASCADE;
DROP TABLE IF EXISTS sys_log_auditoria            CASCADE;
DROP TABLE IF EXISTS sys_rol_permiso              CASCADE;
DROP TABLE IF EXISTS sys_usuario_rol              CASCADE;
DROP TABLE IF EXISTS sys_permiso                  CASCADE;
DROP TABLE IF EXISTS sys_rol                      CASCADE;
DROP TABLE IF EXISTS sys_usuario                  CASCADE;

-- =============================================================================

-- Módulo 1: Gestión de Identidad y Roles
-- Issue 0: Seguridad RBAC

CREATE TABLE sys_rol (
    id_rol      SERIAL      PRIMARY KEY,
    nombre_rol  VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE sys_permiso (
    id_permiso      SERIAL       PRIMARY KEY,
    nombre_permiso  VARCHAR(100) NOT NULL UNIQUE,
    descripcion     TEXT
);

CREATE TABLE sys_usuario (
    id_usuario      SERIAL       PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Tablas intermedias de roles y permisos
CREATE TABLE sys_usuario_rol (
    id_usuario  INT NOT NULL REFERENCES sys_usuario(id_usuario) ON DELETE CASCADE,
    id_rol      INT NOT NULL REFERENCES sys_rol(id_rol)         ON DELETE CASCADE,
    PRIMARY KEY (id_usuario, id_rol)
);

CREATE TABLE sys_rol_permiso (
    id_rol      INT NOT NULL REFERENCES sys_rol(id_rol)         ON DELETE CASCADE,
    id_permiso  INT NOT NULL REFERENCES sys_permiso(id_permiso) ON DELETE CASCADE,
    PRIMARY KEY (id_rol, id_permiso)
);

-- Bitácora de auditoría (trazabilidad)
-- Mediante uso de triggers
CREATE TABLE sys_log_auditoria (
    id_log          SERIAL       PRIMARY KEY,
    id_usuario      INT          REFERENCES sys_usuario(id_usuario),
    accion          VARCHAR(20)  NOT NULL,
    tabla_afectada  VARCHAR(60)  NOT NULL,
    registro_id     INT,
    detalle         TEXT,
    fecha_hora      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Catálogo maestro (elimina la necesidad de diferentes tablas de catálogo separadas)
CREATE TABLE catalogo_maestro (
    id_item         SERIAL       PRIMARY KEY,
    grupo_catalogo  VARCHAR(50)  NOT NULL,
    nombre          VARCHAR(100) NOT NULL,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    UNIQUE (grupo_catalogo, nombre)
);

-- =============================================================================

-- Módulo 1: Gestión de Identidad y Roles
-- Issue 9: Catálogo de Asambleístas

CREATE TABLE asambleista (
    asambleista_id       SERIAL       PRIMARY KEY,
    cedula               VARCHAR(20)  NOT NULL UNIQUE,
    nombre               VARCHAR(150) NOT NULL,
    correo_institucional VARCHAR(100) UNIQUE
);

-- Por disposición del TSE, se permiten cambios de nombre por distintos motivos (registro históricos de cada persona)
CREATE TABLE bitacora_asambleistas (
    id_bitacora         SERIAL       PRIMARY KEY,
    asambleista_id      INT          NOT NULL REFERENCES asambleista(asambleista_id),
    cedula_anterior     VARCHAR(20),
    nombre_anterior     VARCHAR(150),
    razon_cambio        TEXT         NOT NULL,
    fecha_actualizacion TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================

-- Módulo 1: Gestión de Identidad y Roles
-- Issue 14: Historial de nombramientos

-- No deben haber varios nombramientos activos para una misma cédula
-- Se implementa y refuerza mediante un trigger
CREATE TABLE nombramiento (
    id_nombramiento     SERIAL      PRIMARY KEY,
    asambleista_id      INT         NOT NULL REFERENCES asambleista(asambleista_id),
    sector_id           INT         NOT NULL REFERENCES catalogo_maestro(id_item),
    id_puesto           INT         REFERENCES catalogo_maestro(id_item),
    resolucion_id       INT,
    fecha_inicio        DATE        NOT NULL,
    fecha_fin           DATE,
    estado              VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    id_usuario_registro INT         REFERENCES sys_usuario(id_usuario),
    fecha_registro      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fechas_nombramiento 
        CHECK (fecha_fin IS NULL OR fecha_fin > fecha_inicio)
);

-- =============================================================================

-- Módulo 2: Estructura normativa y recursividad
-- Issue 10: Jerarquía de Reglamentos

CREATE TABLE reglamento (
    id_reglamento    SERIAL       PRIMARY KEY,
    nombre_normativa VARCHAR(200) NOT NULL,
    sigla            VARCHAR(20)  NOT NULL UNIQUE
);

-- Esta tabla se apunta a sí misma (recursiva)
-- Compuesta por padres e hijos
CREATE TABLE elemento_normativo (
    id_elemento           SERIAL       PRIMARY KEY,
    id_reglamento         INT          NOT NULL REFERENCES reglamento(id_reglamento),
    id_elemento_padre     INT          REFERENCES elemento_normativo(id_elemento),
    id_nivel_reglamento   INT          NOT NULL REFERENCES catalogo_maestro(id_item),
    numero_etiqueta       VARCHAR(20)  NOT NULL,
    contenido_texto       TEXT,
    orden                 INT          NOT NULL,
    fecha_inicio_vigencia DATE         NOT NULL,
    fecha_fin_vigencia    DATE,
    id_estado_vigencia    INT          NOT NULL REFERENCES catalogo_maestro(id_item),
    CONSTRAINT chk_fechas_vigencia CHECK (fecha_fin_vigencia IS NULL OR fecha_fin_vigencia > fecha_inicio_vigencia)
);




-- =============================================================================

-- Módulo 3: Operatividad de Sesiones
-- Issue 10: Jerarquía de Reglamentos

CREATE TABLE sesiones (
    id_sesion        SERIAL      PRIMARY KEY,
    id_tipo_modalidad INT        NOT NULL REFERENCES catalogo_maestro(id_item),
    id_tipo_sesion   INT         NOT NULL REFERENCES catalogo_maestro(id_item),
    numero_sesion    VARCHAR(20) NOT NULL,
    fecha            DATE        NOT NULL,
    link_acta        TEXT,
    quorum_requerido INT         NOT NULL
);

CREATE TABLE acta (
    id_acta          SERIAL    PRIMARY KEY,
    id_sesion        INT       NOT NULL REFERENCES sesiones(id_sesion),
    fecha_aprobacion DATE,
    url_documento    TEXT,
    observaciones    TEXT
);

CREATE TABLE propuesta (
    id_propuesta             SERIAL       PRIMARY KEY,
    id_reglamento_base       INT          REFERENCES reglamento(id_reglamento),
    id_etapa_propuesta       INT          NOT NULL REFERENCES catalogo_maestro(id_item),
    id_estado_propuesta      INT          NOT NULL REFERENCES catalogo_maestro(id_item),
    id_propuesta_padre       INT          REFERENCES propuesta(id_propuesta),
    titulo                   VARCHAR(300) NOT NULL,
    texto_sustitutivo        TEXT,
    codigo_air               VARCHAR(30),
    id_tipo_mayoria_requerida INT         NOT NULL REFERENCES catalogo_maestro(id_item)
);

-- Bitácora que lleva control del ciclo de vida (cambio de estados) de cada propuesta
CREATE TABLE bitacora_propuesta (
    id_registro_bitacora  SERIAL       PRIMARY KEY,
    id_propuesta          INT          NOT NULL REFERENCES propuesta(id_propuesta),
    id_reglamento_base    INT          REFERENCES reglamento(id_reglamento),
    id_etapa_propuesta    INT          NOT NULL REFERENCES catalogo_maestro(id_item),
    id_estado_propuesta   INT          NOT NULL REFERENCES catalogo_maestro(id_item),
    titulo                VARCHAR(300) NOT NULL,
    codigo_air            VARCHAR(30),
    fecha_modificacion    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_modificacion  INT          REFERENCES sys_usuario(id_usuario)
);

-- Relación N:M entre las propuestas y los proponentes (asambleístas)
CREATE TABLE proponente_propuesta (
    id_proponente_propuesta SERIAL    PRIMARY KEY,
    id_propuesta            INT       NOT NULL REFERENCES propuesta(id_propuesta),
    id_asambleista          INT       NOT NULL REFERENCES asambleista(asambleista_id),
    fecha_registro          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_propuesta, id_asambleista)
);

-- Puente entre las sesiones y propuestas (cuando suceden dentro de la sesión)
CREATE TABLE punto_agenda (
    id_punto_agenda  SERIAL       PRIMARY KEY,
    id_sesion        INT          NOT NULL REFERENCES sesiones(id_sesion),
    id_propuesta     INT          NOT NULL REFERENCES propuesta(id_propuesta),
    orden            INT          NOT NULL,
    descripcion      TEXT
);

CREATE TABLE resolucion (
    id_resolucion    SERIAL       PRIMARY KEY,
    id_sesion        INT          NOT NULL REFERENCES sesiones(id_sesion),
    id_punto_agenda  INT          NOT NULL REFERENCES punto_agenda(id_punto_agenda),
    numero_resolucion VARCHAR(30) NOT NULL UNIQUE,
    fecha_emision    DATE         NOT NULL
);

-- Registro de quien asiste a cada sesión (base para el porcentaje de asistencia)
CREATE TABLE asistencia_sesion_plenaria (
    id_asistencia       SERIAL    PRIMARY KEY,
    id_asambleista      INT       NOT NULL REFERENCES asambleista(asambleista_id),
    id_sesion           INT       NOT NULL REFERENCES sesiones(id_sesion),
    id_estado_asistencia INT      NOT NULL REFERENCES catalogo_maestro(id_item),
    UNIQUE (id_asambleista, id_sesion)
);

-- =============================================================================

-- Módulo 3: Operatividad de Sesiones
-- Issue 15: Gestión de Reformas

-- Conecta la resolución oficial con el cambio en concreto
CREATE TABLE reforma_aplicada (
    id_reforma            SERIAL PRIMARY KEY,
    id_resolucion         INT    NOT NULL REFERENCES resolucion(id_resolucion),
    id_elemento_normativo INT    NOT NULL REFERENCES elemento_normativo(id_elemento),
    id_tipo_reforma       INT    NOT NULL REFERENCES catalogo_maestro(id_item),
    texto_anterior        TEXT,
    texto_nuevo           TEXT   NOT NULL,
    fecha_inicio_vigencia DATE   NOT NULL DEFAULT CURRENT_DATE
);

-- Asegura que nunca se repita un número de certificación
CREATE TABLE control_folio (
    id_control          SERIAL    PRIMARY KEY,
    anio                INT       NOT NULL UNIQUE,
    ultimo_numero       INT       NOT NULL DEFAULT 0,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE certificacion_emitida (
    id_certificacion   SERIAL      PRIMARY KEY,
    id_asambleista     INT         NOT NULL REFERENCES asambleista(asambleista_id),
    folio_unico        VARCHAR(30) NOT NULL UNIQUE,
    hash_seguridad     VARCHAR(64),
    fecha_emision      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_secretaria INT         NOT NULL REFERENCES sys_usuario(id_usuario)
);

-- El folio anulado nunca se reutiliza, solo se marca como inválido
CREATE TABLE anulacion_certificacion (
    id_anulacion     SERIAL    PRIMARY KEY,
    certificacion_id INT       NOT NULL UNIQUE REFERENCES certificacion_emitida(id_certificacion),
    motivo           TEXT      NOT NULL,
    fecha            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================

-- Datos semilla (registros y catálogos mínimos utilizados para realizar pruebas)

-- Catálogo maestro
INSERT INTO catalogo_maestro (grupo_catalogo, nombre) VALUES
    -- Tipos de sesión
    ('TIPO_SESION',       'Ordinaria'),
    ('TIPO_SESION',       'Extraordinaria'),
    -- Modalidades
    ('TIPO_MODALIDAD',    'Presencial'),
    ('TIPO_MODALIDAD',    'Virtual'),
    ('TIPO_MODALIDAD',    'Híbrida'),
    -- Sectores
    ('SECTOR',            'Docente'),
    ('SECTOR',            'Estudiante'),
    ('SECTOR',            'Administrativo'),
    ('SECTOR',            'Egresado'),
    -- Niveles del reglamento
    ('NIVEL_REGLAMENTO',  'Título'),
    ('NIVEL_REGLAMENTO',  'Capítulo'),
    ('NIVEL_REGLAMENTO',  'Artículo'),
    ('NIVEL_REGLAMENTO',  'Inciso'),
    ('NIVEL_REGLAMENTO',  'Sub-inciso'),
    -- Estados de propuesta
    ('ESTADO_PROPUESTA',  'Borrador'),
    ('ESTADO_PROPUESTA',  'Pendiente de Revisión'),
    ('ESTADO_PROPUESTA',  'En Discusión'),
    ('ESTADO_PROPUESTA',  'Aprobada'),
    ('ESTADO_PROPUESTA',  'Rechazada'),
    -- Etapas de propuesta
    ('ETAPA_PROPUESTA',   'Procedencia'),
    ('ETAPA_PROPUESTA',   'Aprobación'),
    ('ETAPA_PROPUESTA',   'Dictamen'),
    -- Tipos de mayoría
    ('TIPO_MAYORIA',      'Simple'),
    ('TIPO_MAYORIA',      'Calificada'),
    -- Estados de vigencia
    ('ESTADO_VIGENCIA',   'Vigente'),
    ('ESTADO_VIGENCIA',   'Histórico'),
    ('ESTADO_VIGENCIA',   'Derogado'),
    -- Tipos de reforma
    ('TIPO_REFORMA',      'Modificación'),
    ('TIPO_REFORMA',      'Derogación'),
    ('TIPO_REFORMA',      'Adición'),
    -- Estados de asistencia
    ('ESTADO_ASISTENCIA', 'Presente'),
    ('ESTADO_ASISTENCIA', 'Ausente'),
    ('ESTADO_ASISTENCIA', 'Justificado'),
    -- Tipos de comisión
    ('TIPO_COMISION',     'Permanente'),
    ('TIPO_COMISION',     'Especial'),
    -- Roles dentro de una comisión
    ('ROL_COMISION',      'Presidente'),
    ('ROL_COMISION',      'Secretario'),
    ('ROL_COMISION',      'Vocal'),
    -- Tipos de trámite
    ('TIPO_TRAMITE',      'Informe'),
    ('TIPO_TRAMITE',      'Moción'),
    ('TIPO_TRAMITE',      'Varios'),
    -- Puestos en la AIR
    ('PUESTO',            'Presidente del Directorio'),
    ('PUESTO',            'Vicepresidente del Directorio'),
    ('PUESTO',            'Secretario del Directorio'),
    ('PUESTO',            'Fiscal'),
    ('PUESTO',            'Representante');

-- Roles del sistema
INSERT INTO sys_rol (nombre_rol) VALUES
    ('SECRETARIA'),
    ('ASISTENTE'),
    ('DIRECTORIO'),
    ('ASAMBLEISTA'),
    ('CONSULTA');

-- Reglamentos base del TEC
INSERT INTO reglamento (nombre_normativa, sigla) VALUES
    ('Estatuto Orgánico del ITCR',                         'EOTEC'),
    ('Reglamento de la Asamblea Institucional Representativa', 'RAIR'),
    ('Políticas Generales del ITCR 2022-2026',             'POLTEC'),
    ('Reglamento del Directorio de la AIR',                'RDAIR'),
    ('Reglamento de Carrera Profesional del ITCR',         'RCPTEC');

-- Control de folios inicial
INSERT INTO control_folio (anio, ultimo_numero) VALUES (2026, 0);

-- =============================================
-- ÍNDICES
-- =============================================

-- PARTIAL UNIQUE INDEX: Garantiza la Regla de Oro de integridad normativa.
-- Impide que existan dos elementos con la misma etiqueta (ej. "Artículo 5")
-- bajo el mismo padre y en estado Vigente simultáneamente.

-- Referencia: Issue #10 — Jerarquía de Reglamentos
CREATE UNIQUE INDEX idx_elemento_vigente_unico
ON elemento_normativo (id_elemento_padre, numero_etiqueta)
WHERE id_estado_vigencia = (
    SELECT id_item
    FROM catalogo_maestro
    WHERE grupo_catalogo = 'ESTADO_VIGENCIA'
      AND nombre = 'Vigente'
);

-- =============================================================================
-- Triggers
-- Issue 15: Gestión de Reformas
-- tg_vigencia_normativa: Versiona automáticamente artículos al insertar una reforma
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_vigencia_normativa()
RETURNS TRIGGER AS $$
DECLARE
    v_id_historico INT;
BEGIN
    SELECT id_item INTO v_id_historico
    FROM catalogo_maestro
    WHERE grupo_catalogo = 'ESTADO_VIGENCIA' AND nombre = 'Histórico';

    UPDATE elemento_normativo
    SET fecha_fin_vigencia = (NEW).fecha_inicio_vigencia,
        id_estado_vigencia = v_id_historico
    WHERE id_elemento      = (NEW).id_elemento_normativo
      AND fecha_fin_vigencia IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_vigencia_normativa
BEFORE INSERT ON reforma_aplicada
FOR EACH ROW
EXECUTE FUNCTION fn_vigencia_normativa();

-- ============================================================
-- TRIGGER: tg_traslape_sector
-- Issue: #14 — Historial de Nombramientos
-- Propósito: Garantizar integridad histórica impidiendo que un
--            asambleísta tenga dos nombramientos ACTIVOS con
--            fechas solapadas simultáneamente.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_validar_traslape_sector()
RETURNS TRIGGER AS $$
DECLARE
    traslape_encontrado INT;
BEGIN
    -- Busca si existe algún nombramiento ACTIVO para el mismo asambleísta
    -- cuyo rango de fechas se solape con el nuevo nombramiento a insertar.
    -- Casos de traslape cubiertos:
    --   1. Nombramiento activo sin fecha_fin (indefinido) — siempre traslapa
    --   2. Nombramiento activo cuya fecha_fin cae después del inicio del nuevo
    SELECT COUNT(*) INTO traslape_encontrado
    FROM nombramiento
    WHERE asambleista_id = NEW.asambleista_id
      AND estado         = 'ACTIVO'
      AND (
          -- Caso 1: nombramiento vigente sin fecha de fin definida
        fecha_fin IS NULL
        OR
          -- Caso 2: el rango existente se solapa con el nuevo
        fecha_inicio <= COALESCE(NEW.fecha_fin, '9999-12-31')
        AND COALESCE(fecha_fin, '9999-12-31') >= NEW.fecha_inicio
      );

    -- Si encontró al menos un traslape, bloquea la inserción
    IF traslape_encontrado > 0 THEN
        RAISE EXCEPTION 
            'TRASLAPE_SECTOR: El asambleísta con ID % ya tiene un nombramiento ACTIVO que se solapa con las fechas indicadas (% a %). Finalice el nombramiento vigente antes de crear uno nuevo.',
            NEW.asambleista_id,
            NEW.fecha_inicio,
            COALESCE(NEW.fecha_fin::TEXT, 'indefinido');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asocia la función al evento BEFORE INSERT de la tabla nombramiento.
-- FOR EACH ROW garantiza que se ejecute una vez por cada fila insertada.
CREATE TRIGGER tg_traslape_sector
    BEFORE INSERT OR UPDATE ON nombramiento
    FOR EACH ROW
    EXECUTE FUNCTION fn_validar_traslape_sector();

-- ============================================================
-- TRIGGER: tg_no_repudio_cert
-- Issue: #17 — Generador de Atestados
-- Propósito: Garantizar fe pública e inalterabilidad total.
--            Ninguna certificación emitida puede modificarse
--            ni eliminarse bajo ninguna circunstancia.
--            El RAISE EXCEPTION permite que el Controlador
--            capture el error y lo muestre correctamente en
--            la Vista sin que la operación llegue a la BD.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_no_repudio_cert()
RETURNS TRIGGER AS $$
BEGIN
    -- Bloquea cualquier intento de UPDATE sin importar qué columna
    -- se intente modificar, incluyendo hash y folio.
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION
            'NO_REPUDIO: La certificación con folio % es un documento oficial emitido y no puede ser modificada. Contacte a la Secretaría AIR para su anulación formal.',
            OLD.folio_unico;
    END IF;

    -- Bloquea cualquier intento de DELETE directo sobre la tabla.
    -- Las anulaciones deben registrarse en anulacion_certificacion,
    -- nunca eliminando el registro original.
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'NO_REPUDIO: La certificación con folio % no puede ser eliminada. El sistema de fe pública exige inmutabilidad total del registro original.',
            OLD.folio_unico;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Asocia la función a UPDATE y DELETE en certificacion_emitida.
-- FOR EACH ROW garantiza que se evalúe cada fila afectada.
CREATE TRIGGER tg_no_repudio_cert
    BEFORE UPDATE OR DELETE ON certificacion_emitida
    FOR EACH ROW
    EXECUTE FUNCTION fn_no_repudio_cert();

-- ============================================================
-- TRIGGER: tg_folio_secuencial
-- Issue: #17 — Generador de Atestados
-- Propósito: Generar y asignar de forma atómica el folio único
--            institucional en formato DAIR-000-AÑO antes de
--            insertar la certificación, evitando duplicados
--            en procesos concurrentes.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_folio_secuencial()
RETURNS TRIGGER AS $$
DECLARE
    anio_actual     INT;
    nuevo_numero    INT;
    folio_generado  VARCHAR(30);
BEGIN
    -- Obtiene el año actual del servidor de base de datos
    anio_actual := EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INT;

    -- Incrementa el contador del año actual de forma atómica.
    -- UPDATE  RETURNING garantiza que en procesos concurrentes
    -- cada inserción obtenga un número único sin condiciones de carrera.
    UPDATE control_folio
    SET
        ultimo_numero       = ultimo_numero + 1,
        fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE anio = anio_actual
    RETURNING ultimo_numero INTO nuevo_numero;

    -- Si no existe fila para el año actual la crea con contador en 1.
    -- Esto ocurre automáticamente al inicio de cada año calendario.
    IF nuevo_numero IS NULL THEN
        INSERT INTO control_folio (anio, ultimo_numero, fecha_actualizacion)
        VALUES (anio_actual, 1, CURRENT_TIMESTAMP)
        RETURNING ultimo_numero INTO nuevo_numero;
    END IF;

    -- Construye el folio en formato DAIR-000-AÑO.
    -- FM elimina espacios de relleno en to_char.
    -- El número crece naturalmente si supera 3 dígitos (ej. DAIR-1000-2025).
    folio_generado := 'DAIR-' || to_char(nuevo_numero, 'FM000') || '-' || anio_actual::TEXT;

    -- Asigna el folio generado a la fila que se va a insertar
    NEW.folio_unico := folio_generado;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asocia la función al evento BEFORE INSERT de certificacion_emitida.
-- FOR EACH ROW garantiza ejecución por cada certificación emitida.
CREATE TRIGGER tg_folio_secuencial
    BEFORE INSERT ON certificacion_emitida
    FOR EACH ROW
    EXECUTE FUNCTION fn_folio_secuencial();