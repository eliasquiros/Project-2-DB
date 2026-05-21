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
ALTER TABLE sys_log_auditoria ADD COLUMN dir_IP VARCHAR(45);     -- Agregar registro de IP al log
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

-- Insertar usuarios
INSERT INTO sys_usuario (username, password_hash, email, activo) VALUES
('secretaria', '1234', 'secretaria@tec.ac.cr', true),
('asambleista', '1234', 'asambleista@tec.ac.cr', true);

-- Asignar roles
INSERT INTO sys_usuario_rol (id_usuario, id_rol) VALUES
((SELECT id_usuario FROM sys_usuario WHERE username = 'secretaria'),
 (SELECT id_rol FROM sys_rol WHERE nombre_rol = 'SECRETARIA')),
((SELECT id_usuario FROM sys_usuario WHERE username = 'asambleista'),
 (SELECT id_rol FROM sys_rol WHERE nombre_rol = 'ASAMBLEISTA'));

-- =============================================
-- ÍNDICES
-- =============================================

-- PARTIAL UNIQUE INDEX: Garantiza la Regla de Oro de integridad normativa.
-- Impide que existan dos elementos con la misma etiqueta (ej. "Artículo 5")
-- bajo el mismo padre y en estado Vigente simultáneamente.

-- Referencia: Issue #10 — Jerarquía de Reglamentos
CREATE UNIQUE INDEX idx_elemento_vigente_unico
ON elemento_normativo (id_elemento_padre, numero_etiqueta)
WHERE id_estado_vigencia = 25;

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

-- ============================================================
-- TRIGGER: tg_auditoria_total
-- Issue: #13 — Bitácora de Auditoría
-- Tablas: asambleista, nombramiento, resolucion
-- Evento: AFTER INSERT, UPDATE, DELETE
-- Propósito: Registrar automáticamente en sys_log_auditoria
--            quién, cuándo y qué cambió en datos sensibles.
--            El usuario se identifica mediante la variable de
--            sesión app.usuario_id seteada por Node.js con
--            SET LOCAL antes de cada operación auditada.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_auditoria_total()
RETURNS TRIGGER AS $$
DECLARE
    usuario_id_log  INT;
    registro_id_log INT;
    detalle_log     TEXT;
BEGIN
    -- Lee el id del usuario activo desde la variable de sesión.
    -- El true evita error si la variable no existe, devuelve NULL.
    usuario_id_log := current_setting('app.usuario_id', true)::INT;

    -- Determina el id del registro afectado según la operación.
    -- En DELETE usa OLD porque NEW no existe.
    -- En INSERT y UPDATE usa NEW.
    IF TG_OP = 'DELETE' THEN
        CASE TG_TABLE_NAME
            WHEN 'asambleista'  THEN registro_id_log := OLD.asambleista_id;
            WHEN 'nombramiento' THEN registro_id_log := OLD.id_nombramiento;
            WHEN 'resolucion'   THEN registro_id_log := OLD.id_resolucion;
        END CASE;
        detalle_log := 'Registro eliminado. ID: ' || registro_id_log::TEXT;
    ELSE
        CASE TG_TABLE_NAME
            WHEN 'asambleista'  THEN registro_id_log := NEW.asambleista_id;
            WHEN 'nombramiento' THEN registro_id_log := NEW.id_nombramiento;
            WHEN 'resolucion'   THEN registro_id_log := NEW.id_resolucion;
        END CASE;

        -- En UPDATE registra qué cambió comparando OLD y NEW
        IF TG_OP = 'UPDATE' THEN
            detalle_log := 'Registro actualizado. ID: ' || registro_id_log::TEXT;
        ELSE
            detalle_log := 'Registro creado. ID: ' || registro_id_log::TEXT;
        END IF;
    END IF;

    -- Inserta el log con todos los datos disponibles.
    
    INSERT INTO sys_log_auditoria (
        id_usuario,
        accion,
        tabla_afectada,
        registro_id,
        detalle,
        fecha_hora
    ) VALUES (
        usuario_id_log,
        TG_OP,
        TG_TABLE_NAME,
        registro_id_log,
        detalle_log,
        CURRENT_TIMESTAMP
        
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para tabla asambleista
CREATE TRIGGER tg_auditoria_asambleista
    AFTER INSERT OR UPDATE OR DELETE ON asambleista
    FOR EACH ROW
    EXECUTE FUNCTION fn_auditoria_total();

-- Trigger para tabla nombramiento
CREATE TRIGGER tg_auditoria_nombramiento
    AFTER INSERT OR UPDATE OR DELETE ON nombramiento
    FOR EACH ROW
    EXECUTE FUNCTION fn_auditoria_total();

-- Trigger para tabla resolucion
CREATE TRIGGER tg_auditoria_resolucion
    AFTER INSERT OR UPDATE OR DELETE ON resolucion
    FOR EACH ROW
    EXECUTE FUNCTION fn_auditoria_total();

CREATE OR REPLACE FUNCTION fn_validar_quorum()
RETURNS TRIGGER AS $$
DECLARE
    quorum_requerido_sesion  INT;
    presentes_sesion         INT;
    id_sesion_resolucion     INT;
    id_estado_presente       INT;
BEGIN
    -- Obtiene el id_sesion a través del punto_agenda
    -- ya que resolucion referencia id_punto_agenda
    SELECT pa.id_sesion INTO id_sesion_resolucion
    FROM punto_agenda pa
    WHERE pa.id_punto_agenda = NEW.id_punto_agenda;

    IF id_sesion_resolucion IS NULL THEN
        RAISE EXCEPTION
            'QUORUM_ERROR: No se encontró la sesión asociada al punto de agenda %.',
            NEW.id_punto_agenda;
    END IF;

    -- Obtiene el quórum mínimo requerido definido en la sesión
    SELECT quorum_requerido INTO quorum_requerido_sesion
    FROM sesiones
    WHERE id_sesion = id_sesion_resolucion;

    -- Obtiene el id del estado Presente desde el catálogo
    SELECT id_item INTO id_estado_presente
    -- Correción: leer desde catalogo_maestro, no desde la tabla que no existe
    FROM catalogo_maestro
    WHERE grupo_catalogo = 'ESTADO_ASISTENCIA'
        AND nombre = 'Presente'
    LIMIT 1;

    -- Cuenta los asambleístas presentes en la sesión
    SELECT COUNT(*) INTO presentes_sesion
    FROM asistencia_sesion_plenaria
    WHERE id_sesion          = id_sesion_resolucion
      AND id_estado_asistencia = id_estado_presente;

    -- Bloquea la inserción si no se alcanza el quórum mínimo
    IF presentes_sesion < quorum_requerido_sesion THEN
        RAISE EXCEPTION
            'QUORUM_INSUFICIENTE: La sesión % requiere % miembros presentes para sesionar legalmente. Presentes registrados: %.',
            id_sesion_resolucion,
            quorum_requerido_sesion,
            presentes_sesion;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_validar_quorum
    BEFORE INSERT ON resolucion
    FOR EACH ROW
    EXECUTE FUNCTION fn_validar_quorum();

-- =============================================================================

-- Sprint 3 - Semana 1
-- Tablas necesarias
-- Issues #5, #6, #7, #10 (Parte II), #11, #12, #13, #16, #17

-- =============================================================================

-- Módulo 4: Comisiones e Informes
-- Issue 7: Gestión de comisiones y proponentes

CREATE TABLE comision (
    id_comision      SERIAL       PRIMARY KEY,
    id_tipo_comision INT          NOT NULL REFERENCES catalogo_maestro(id_item),
    nombre_comision  VARCHAR(255) NOT NULL,
    fecha_creacion   DATE         NOT NULL DEFAULT CURRENT_DATE,
    activo           BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Relación N:M entre asambleístas y comisiones
CREATE TABLE integrante_comision (
    id_integrante_comision  SERIAL      PRIMARY KEY,
    id_comision             INT         NOT NULL REFERENCES comision(id_comision),
    id_asambleista          INT         NOT NULL REFERENCES asambleista(asambleista_id),
    id_rol_comision         INT         NOT NULL REFERENCES catalogo_maestro(id_item),
    fecha_ingreso           DATE        NOT NULL,
    fecha_fin               DATE,
    estado                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    CONSTRAINT chk_fechas_integrante
        CHECK (fecha_fin IS NULL OR fecha_fin > fecha_ingreso),
    CONSTRAINT uq_integrante_comision
        UNIQUE (id_comision, id_asambleista, fecha_ingreso)
);

-- Historial de cambios de rol en las comisiones
CREATE TABLE bitacora_integrante_comision (
    id_bitacora      SERIAL    PRIMARY KEY,
    id_integrante    INT       NOT NULL REFERENCES integrante_comision(id_integrante_comision),
    id_rol_anterior  INT       REFERENCES catalogo_maestro(id_item),
    id_rol_nuevo     INT       REFERENCES catalogo_maestro(id_item),
    fecha_cambio     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo           TEXT
);

-- Indica a cada comisión que propuestas debe analizar
CREATE TABLE propositos_comision (
    id_proposito_comision  SERIAL    PRIMARY KEY,
    id_comision            INT       NOT NULL REFERENCES comision(id_comision),
    id_propuesta           INT       NOT NULL REFERENCES propuesta(id_propuesta),
    texto                  TEXT,
    fecha_registro         DATE      NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT uq_proposito UNIQUE (id_comision, id_propuesta)
);

-- Registro de reuniones de las comisiones
CREATE TABLE sesion_comision (
    id_sesion_comision  SERIAL       PRIMARY KEY,
    id_comision         INT          NOT NULL REFERENCES comision(id_comision),
    fecha_hora          TIMESTAMP    NOT NULL,
    lugar               VARCHAR(200)
);

-- Clave para las certificaciones y participación activa
CREATE TABLE asistencia_sesion_comision (
    id_asistencia_comision  SERIAL PRIMARY KEY,
    id_sesion_comision      INT    NOT NULL REFERENCES sesion_comision(id_sesion_comision),
    id_asambleista          INT    NOT NULL REFERENCES asambleista(asambleista_id),
    id_comision             INT    NOT NULL REFERENCES comision(id_comision),
    id_estado_asistencia    INT    NOT NULL REFERENCES catalogo_maestro(id_item),
    CONSTRAINT uq_asistencia_comision
        UNIQUE (id_sesion_comision, id_asambleista)
);

CREATE TABLE punto_agenda_sesion_comision (
    id_punto_agenda_sc  SERIAL       PRIMARY KEY,
    id_sesion_comision  INT          NOT NULL REFERENCES sesion_comision(id_sesion_comision),
    id_proposito        INT          NOT NULL REFERENCES propositos_comision(id_proposito_comision),
    id_tipo_tramite     INT          NOT NULL REFERENCES catalogo_maestro(id_item),
    orden               INT          NOT NULL,
    titulo              VARCHAR(300),
    descripcion         TEXT
);

-- =============================================================================

-- Issue 7: Gestión de comisiones y proponentes

-- Argumento legal del informe
CREATE TABLE justificacion_legal (
    id_argumento    SERIAL  PRIMARY KEY,
    es_considerando BOOLEAN NOT NULL DEFAULT TRUE,
    contenido       TEXT    NOT NULL
);

-- Informe que la comisión entrega
CREATE TABLE informe_directorio (
    id_informe          SERIAL PRIMARY KEY,
    id_comision         INT    NOT NULL REFERENCES comision(id_comision),
    id_propuesta        INT    NOT NULL REFERENCES propuesta(id_propuesta),
    id_sesion           INT    NOT NULL REFERENCES sesiones(id_sesion),
    recomendacion       TEXT   NOT NULL,
    fecha_presentacion  DATE   NOT NULL
);

-- Relación N:M entre los informes y sus justificaciones 
CREATE TABLE justificaciones_por_informe (
    id_informe      INT NOT NULL REFERENCES informe_directorio(id_informe),
    id_argumento    INT NOT NULL REFERENCES justificacion_legal(id_argumento),
    orden_aparicion INT NOT NULL,
    PRIMARY KEY (id_informe, id_argumento)
);

-- =============================================================================

-- Módulo 3: Sesiones y Trámite Legislativo
-- Funciones de sesiones
-- Issue 11: Control de quórum

-- Valida la votación para un quórum de manera manual
CREATE OR REPLACE FUNCTION validar_quorum_legal(p_id_sesion INT)
RETURNS BOOLEAN AS $$
DECLARE
    v_presentes     INT;
    v_quorum_req    INT;
    v_id_presente   INT;
BEGIN
    SELECT id_item INTO v_id_presente
    FROM catalogo_maestro
    WHERE grupo_catalogo = 'ESTADO_ASISTENCIA'
      AND nombre = 'Presente'
    LIMIT 1;

    SELECT COUNT(*) INTO v_presentes
    FROM asistencia_sesion_plenaria
    WHERE id_sesion           = p_id_sesion
      AND id_estado_asistencia = v_id_presente;

    SELECT quorum_requerido INTO v_quorum_req
    FROM sesiones
    WHERE id_sesion = p_id_sesion;

    RETURN v_presentes >= v_quorum_req;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================

-- Issue 12: Motor de votaciones

CREATE OR REPLACE FUNCTION calcular_resultado_votacion(
    p_votos_favor  INT,
    p_votos_contra INT,
    p_tipo_mayoria VARCHAR(20)   -- 'Simple' o 'Calificada'
)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_total_emitidos INT;
BEGIN
    v_total_emitidos := p_votos_favor + p_votos_contra;

    IF p_tipo_mayoria = 'Simple' THEN
        IF p_votos_favor > p_votos_contra THEN
            RETURN 'APROBADO';
        ELSE
            RETURN 'RECHAZADO';
        END IF;

    ELSIF p_tipo_mayoria = 'Calificada' THEN
        -- 66% sobre votos emitidos, no sobre total de miembros
        IF v_total_emitidos > 0
           AND (p_votos_favor::DECIMAL / v_total_emitidos) >= 0.66 THEN
            RETURN 'APROBADO';
        ELSE
            RETURN 'RECHAZADO';
        END IF;

    ELSE
        RAISE EXCEPTION 'Tipo de mayoría desconocido: %', p_tipo_mayoria;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Calcula la asistencia de un asambleísta a las sesiones en un rango de fechas (sesiones asistidas, total convocadas, porcentaje)
CREATE OR REPLACE FUNCTION calcular_porcentaje_asistencia(
    p_id_asambleista INT,
    p_fecha_inicio   DATE,
    p_fecha_fin      DATE
)
RETURNS TABLE(
    sesiones_asistidas INT,
    sesiones_totales   INT,
    porcentaje         DECIMAL
) AS $$
DECLARE
    v_id_presente INT;
BEGIN
    SELECT id_item INTO v_id_presente
    FROM catalogo_maestro
    WHERE grupo_catalogo = 'ESTADO_ASISTENCIA'
      AND nombre = 'Presente'
    LIMIT 1;

    RETURN QUERY
    SELECT
        COUNT(CASE WHEN asp.id_estado_asistencia = v_id_presente THEN 1 END)::INT,
        COUNT(*)::INT,
        ROUND(
            COUNT(CASE WHEN asp.id_estado_asistencia = v_id_presente THEN 1 END)::DECIMAL
            / NULLIF(COUNT(*), 0) * 100,
        2) AS porcentaje
    FROM asistencia_sesion_plenaria asp
    JOIN sesiones s ON s.id_sesion = asp.id_sesion
    WHERE asp.id_asambleista = p_id_asambleista
      AND s.fecha BETWEEN p_fecha_inicio AND p_fecha_fin;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================

-- Issue 6: Motor de notas condicionales

CREATE TABLE catalogo_nota_condicional (
    id_nota             SERIAL       PRIMARY KEY,
    codigo_tipo_origen  VARCHAR(50)  NOT NULL UNIQUE,
    descripcion_interna VARCHAR(200),
    texto_nota          TEXT         NOT NULL,
    activo              BOOLEAN      NOT NULL DEFAULT TRUE
);

INSERT INTO catalogo_nota_condicional (codigo_tipo_origen, descripcion_interna, texto_nota) VALUES
(
    'CI_DIRECTO',
    'Propuesta enviada directamente por el Consejo Institucional',
    'La Secretaría de la AIR no dispone de registros de asistencia para esta etapa, ya que la propuesta fue presentada directamente por el Consejo Institucional.'
),
(
    'DIEZ_PORCIENTO',
    'Propuesta por el 10% de la Asamblea en etapa de procedencia',
    'La Secretaría de la AIR no dispone de registros de asistencia en etapa de procedencia para propuestas presentadas por el 10% de los asambleístas.'
);

CREATE OR REPLACE FUNCTION obtener_nota_certificacion(p_id_propuesta INT)
RETURNS TEXT AS $$
DECLARE
    v_nota        TEXT := NULL;
    v_etapa_nombre VARCHAR(100);
BEGIN
    SELECT cm.nombre INTO v_etapa_nombre
    FROM propuesta p
    JOIN catalogo_maestro cm ON cm.id_item = p.id_etapa_propuesta
    WHERE p.id_propuesta = p_id_propuesta;

    IF v_etapa_nombre ILIKE '%Consejo Institucional%' THEN
        SELECT texto_nota INTO v_nota
        FROM catalogo_nota_condicional
        WHERE codigo_tipo_origen = 'CI_DIRECTO' AND activo = TRUE;

    ELSIF v_etapa_nombre ILIKE '%Procedencia%' THEN
        SELECT texto_nota INTO v_nota
        FROM catalogo_nota_condicional
        WHERE codigo_tipo_origen = 'DIEZ_PORCIENTO' AND activo = TRUE;
    END IF;

    RETURN v_nota;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================

-- Issue 10: Parte II e Issue 16: Vistas SQL

-- Filtra solo los elementos donde no hay fecha de vigencia, no se puede ver un artículo derogado
CREATE OR REPLACE VIEW v_reglamento_vigente AS
SELECT
    en.id_elemento,
    r.nombre_normativa,
    r.sigla,
    cm_nivel.nombre       AS nivel,
    en.numero_etiqueta,
    en.contenido_texto,
    en.orden,
    en.id_elemento_padre,
    en.fecha_inicio_vigencia
FROM elemento_normativo en
JOIN reglamento      r        ON r.id_reglamento     = en.id_reglamento
JOIN catalogo_maestro cm_nivel ON cm_nivel.id_item   = en.id_nivel_reglamento
JOIN catalogo_maestro cm_vig   ON cm_vig.id_item     = en.id_estado_vigencia
WHERE en.fecha_fin_vigencia IS NULL
  AND cm_vig.grupo_catalogo  = 'ESTADO_VIGENCIA'
  AND cm_vig.nombre          = 'Vigente';

-- Une las sesiones con sus respectivas agendas y propuestas
CREATE OR REPLACE VIEW v_agenda_sesion AS
SELECT
    s.id_sesion,
    s.numero_sesion,
    s.fecha,
    cm_ts.nombre    AS tipo_sesion,
    cm_tm.nombre    AS modalidad,
    pa.id_punto_agenda,
    pa.orden,
    pa.descripcion,
    p.id_propuesta,
    p.titulo        AS propuesta_titulo,
    cm_et.nombre    AS etapa,
    cm_es.nombre    AS estado_propuesta
FROM sesiones s
JOIN catalogo_maestro cm_ts ON cm_ts.id_item = s.id_tipo_sesion
JOIN catalogo_maestro cm_tm ON cm_tm.id_item = s.id_tipo_modalidad
LEFT JOIN punto_agenda pa   ON pa.id_sesion   = s.id_sesion
LEFT JOIN propuesta    p    ON p.id_propuesta  = pa.id_propuesta
LEFT JOIN catalogo_maestro cm_et ON cm_et.id_item = p.id_etapa_propuesta
LEFT JOIN catalogo_maestro cm_es ON cm_es.id_item = p.id_estado_propuesta
ORDER BY s.fecha DESC, pa.orden;

-- Para dashboard de issue 16; certificaciones por mes
CREATE OR REPLACE VIEW v_certificaciones_por_mes AS
SELECT
    EXTRACT(YEAR  FROM fecha_emision)::INT AS anno,
    EXTRACT(MONTH FROM fecha_emision)::INT AS mes,
    COUNT(*)                               AS total_emitidas,
    COUNT(CASE WHEN estado = 'ANULADO' THEN 1 END) AS total_anuladas
FROM certificacion_emitida
GROUP BY anno, mes
ORDER BY anno DESC, mes DESC;

-- Agregar columna "estado" a la tabla certificacion_emitida
ALTER TABLE certificacion_emitida
    ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO';

-- Agregar vistas para reportes y dashboard
CREATE OR REPLACE VIEW v_asambleistas_mas_consultados AS
SELECT
    a.asambleista_id,
    a.nombre,
    a.cedula,
    COUNT(ce.id_certificacion) AS total_certificaciones,
    MAX(ce.fecha_emision)      AS ultima_certificacion
FROM asambleista a
JOIN certificacion_emitida ce ON ce.id_asambleista = a.asambleista_id
GROUP BY a.asambleista_id, a.nombre, a.cedula
ORDER BY total_certificaciones DESC;

CREATE OR REPLACE VIEW v_propuestas_por_estado AS
SELECT
    cm.nombre  AS estado,
    COUNT(*)   AS total
FROM propuesta p
JOIN catalogo_maestro cm ON cm.id_item = p.id_estado_propuesta
GROUP BY cm.nombre
ORDER BY total DESC;

-- =============================================================================

-- Módulo 5: Motor de Certificaciones y Fe Pública
-- Issue 17: Motor de Generación de Certificaciones Legales

-- Vista consolidada para el motor de certificaciones
CREATE OR REPLACE VIEW v_hoja_vida_asambleista AS

-- Parte 1: participaciones como proponente
SELECT
    a.asambleista_id,
    a.nombre,
    a.cedula,
    a.correo_institucional,
    n.id_nombramiento,
    n.fecha_inicio           AS nombramiento_inicio,
    n.fecha_fin              AS nombramiento_fin,
    n.estado                 AS nombramiento_estado,
    cm_sec.nombre            AS sector,
    cm_pue.nombre            AS puesto,
    p.id_propuesta,
    p.titulo                 AS propuesta_titulo,
    p.codigo_air,
    cm_et.nombre             AS etapa_propuesta,
    cm_es.nombre             AS estado_propuesta,
    s.id_sesion,
    s.numero_sesion,
    s.fecha                  AS fecha_sesion,
    res.numero_resolucion,
    res.fecha_emision        AS fecha_resolucion,
    'PROPONENTE'::VARCHAR    AS tipo_participacion
FROM asambleista a
JOIN nombramiento         n    ON n.asambleista_id   = a.asambleista_id
JOIN catalogo_maestro  cm_sec  ON cm_sec.id_item     = n.sector_id
JOIN catalogo_maestro  cm_pue  ON cm_pue.id_item     = n.id_puesto
JOIN proponente_propuesta pp   ON pp.id_asambleista  = a.asambleista_id
JOIN propuesta            p    ON p.id_propuesta     = pp.id_propuesta
JOIN catalogo_maestro  cm_et   ON cm_et.id_item      = p.id_etapa_propuesta
JOIN catalogo_maestro  cm_es   ON cm_es.id_item      = p.id_estado_propuesta
LEFT JOIN punto_agenda    pa   ON pa.id_propuesta    = p.id_propuesta
LEFT JOIN sesiones        s    ON s.id_sesion        = pa.id_sesion
LEFT JOIN resolucion      res  ON res.id_punto_agenda = pa.id_punto_agenda

UNION ALL

-- Parte 2: participaciones como integrante de comisión
SELECT
    a.asambleista_id,
    a.nombre,
    a.cedula,
    a.correo_institucional,
    n.id_nombramiento,
    n.fecha_inicio,
    n.fecha_fin,
    n.estado,
    cm_sec.nombre,
    cm_pue.nombre,
    p.id_propuesta,
    p.titulo,
    p.codigo_air,
    cm_et.nombre,
    cm_es.nombre,
    s.id_sesion,
    s.numero_sesion,
    s.fecha,
    res.numero_resolucion,
    res.fecha_emision,
    'COMISION'::VARCHAR
FROM asambleista a
JOIN nombramiento         n    ON n.asambleista_id    = a.asambleista_id
JOIN catalogo_maestro  cm_sec  ON cm_sec.id_item      = n.sector_id
JOIN catalogo_maestro  cm_pue  ON cm_pue.id_item      = n.id_puesto
JOIN integrante_comision ic    ON ic.id_asambleista   = a.asambleista_id
JOIN propositos_comision pcm   ON pcm.id_comision     = ic.id_comision
JOIN propuesta            p    ON p.id_propuesta      = pcm.id_propuesta
JOIN catalogo_maestro  cm_et   ON cm_et.id_item       = p.id_etapa_propuesta
JOIN catalogo_maestro  cm_es   ON cm_es.id_item       = p.id_estado_propuesta
LEFT JOIN punto_agenda    pa   ON pa.id_propuesta     = p.id_propuesta
LEFT JOIN sesiones        s    ON s.id_sesion         = pa.id_sesion
LEFT JOIN resolucion      res  ON res.id_punto_agenda = pa.id_punto_agenda;

-- Función que la consume
CREATE OR REPLACE FUNCTION obtener_historial_atestados(p_id_asambleista INT)
RETURNS TABLE(
    propuesta_titulo    TEXT,
    codigo_air          VARCHAR,
    etapa_propuesta     VARCHAR,
    estado_propuesta    VARCHAR,
    tipo_participacion  VARCHAR,
    fecha_sesion        DATE,
    numero_sesion       VARCHAR,
    numero_resolucion   VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        hv.propuesta_titulo::TEXT,
        hv.codigo_air,
        hv.etapa_propuesta,
        hv.estado_propuesta,
        hv.tipo_participacion,
        hv.fecha_sesion,
        hv.numero_sesion,
        hv.numero_resolucion
    FROM v_hoja_vida_asambleista hv
    WHERE hv.asambleista_id = p_id_asambleista
    ORDER BY hv.fecha_sesion NULLS LAST;
END;
$$ LANGUAGE plpgsql;