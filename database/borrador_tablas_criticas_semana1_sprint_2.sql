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






