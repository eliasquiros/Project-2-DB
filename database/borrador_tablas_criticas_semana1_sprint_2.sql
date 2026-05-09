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