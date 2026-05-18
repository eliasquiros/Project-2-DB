# Diccionario de Datos — Sistema de Gestión Legislativa AIR

**Proyecto:** Modernización del Sistema de Gestión Documental y Normativa de la Secretaría de la AIR  
**Motor:** PostgreSQL / CockroachDB  
**Sprint:** 2  
**Última actualización:** 2026

---

## Índice de Tablas

| Módulo | Tabla | Descripción breve |
|--------|-------|-------------------|
| Seguridad | [`sys_rol`](#sys_rol) | Roles del sistema (RBAC) |
| Seguridad | [`sys_permiso`](#sys_permiso) | Permisos disponibles en el sistema |
| Seguridad | [`sys_usuario`](#sys_usuario) | Usuarios con acceso al sistema |
| Seguridad | [`sys_usuario_rol`](#sys_usuario_rol) | Relación N:M entre usuarios y roles |
| Seguridad | [`sys_rol_permiso`](#sys_rol_permiso) | Relación N:M entre roles y permisos |
| Auditoría | [`sys_log_auditoria`](#sys_log_auditoria) | Bitácora central de todas las acciones críticas |
| Catálogos | [`catalogo_maestro`](#catalogo_maestro) | Tabla única de catálogos parametrizables |
| Actores | [`asambleista`](#asambleista) | Identidad permanente de cada representante |
| Actores | [`bitacora_asambleistas`](#bitacora_asambleistas) | Historial de cambios de nombre o cédula |
| Actores | [`nombramiento`](#nombramiento) | Periodos de representación por sector |
| Normativa | [`reglamento`](#reglamento) | Reglamentos y estatutos del TEC |
| Normativa | [`elemento_normativo`](#elemento_normativo) | Estructura jerárquica recursiva (Título › Capítulo › Artículo › Inciso) |
| Sesiones | [`sesiones`](#sesiones) | Sesiones plenarias de la AIR |
| Sesiones | [`acta`](#acta) | Actas formales de cada sesión |
| Sesiones | [`propuesta`](#propuesta) | Mociones y propuestas de reforma |
| Sesiones | [`bitacora_propuesta`](#bitacora_propuesta) | Historial de cambios de estado de cada propuesta |
| Sesiones | [`proponente_propuesta`](#proponente_propuesta) | Autoría múltiple de propuestas (N:M) |
| Sesiones | [`punto_agenda`](#punto_agenda) | Ítems de la agenda por sesión |
| Sesiones | [`resolucion`](#resolucion) | Número oficial de acuerdo emitido |
| Sesiones | [`asistencia_sesion_plenaria`](#asistencia_sesion_plenaria) | Registro de asistencia por sesión |
| Certificaciones | [`reforma_aplicada`](#reforma_aplicada) | Vínculo entre resolución y cambio normativo concreto |
| Certificaciones | [`control_folio`](#control_folio) | Control atómico de numeración de certificaciones |
| Certificaciones | [`certificacion_emitida`](#certificacion_emitida) | Registro de certificaciones generadas |
| Certificaciones | [`anulacion_certificacion`](#anulacion_certificacion) | Anulaciones de folios (el número nunca se reutiliza) |

---

## Módulo de Seguridad y Roles (Issue #0)

### `sys_rol`

Almacena los roles disponibles en el sistema. Cada rol agrupa un conjunto de permisos que definen lo que el usuario puede hacer. Los roles iniciales son: `SECRETARIA`, `ASISTENTE`, `DIRECTORIO`, `ASAMBLEISTA`, `CONSULTA`.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_rol` | SERIAL | PK | Identificador único autoincremental del rol |
| `nombre_rol` | VARCHAR(50) | NOT NULL, UNIQUE | Nombre descriptivo del rol (ej. `SECRETARIA`) |

---

### `sys_permiso`

Define las acciones que pueden ser autorizadas dentro del sistema. Se asocian a roles mediante `sys_rol_permiso`.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_permiso` | SERIAL | PK | Identificador único del permiso |
| `nombre_permiso` | VARCHAR(100) | NOT NULL, UNIQUE | Nombre técnico de la acción (ej. `EMITIR_CERTIFICACION`) |
| `descripcion` | TEXT | — | Descripción legible de para qué sirve el permiso |

---

### `sys_usuario`

Representa a cada persona con acceso al sistema. La contraseña nunca se almacena en texto plano; siempre se guarda su hash (BCrypt u otro algoritmo fuerte).

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_usuario` | SERIAL | PK | Identificador único del usuario |
| `username` | VARCHAR(50) | NOT NULL, UNIQUE | Nombre de inicio de sesión |
| `password_hash` | VARCHAR(255) | NOT NULL | Contraseña cifrada (nunca texto plano) |
| `email` | VARCHAR(100) | NOT NULL, UNIQUE | Correo electrónico institucional |
| `activo` | BOOLEAN | NOT NULL, DEFAULT TRUE | Permite desactivar usuarios sin borrarlos |

---

### `sys_usuario_rol`

Tabla intermedia que implementa la relación N:M entre usuarios y roles. Un usuario puede tener múltiples roles y un rol puede asignarse a múltiples usuarios.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_usuario` | INT | PK (compuesta), FK → `sys_usuario` | Referencia al usuario |
| `id_rol` | INT | PK (compuesta), FK → `sys_rol` | Referencia al rol asignado |

> **Nota:** La PK compuesta (`id_usuario`, `id_rol`) garantiza que no se duplique una asignación.

---

### `sys_rol_permiso`

Tabla intermedia que asocia permisos a roles. Define qué puede hacer cada rol dentro del sistema.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_rol` | INT | PK (compuesta), FK → `sys_rol` | Referencia al rol |
| `id_permiso` | INT | PK (compuesta), FK → `sys_permiso` | Referencia al permiso habilitado |

---

### `sys_log_auditoria`

Bitácora central del sistema. Cada operación crítica (INSERT, UPDATE, DELETE) en tablas sensibles genera un registro aquí, accionado por triggers. Permite saber quién hizo qué y cuándo.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_log` | SERIAL | PK | Identificador único del registro de auditoría |
| `id_usuario` | INT | FK → `sys_usuario` | Usuario que realizó la acción (puede ser NULL si el sistema la ejecuta) |
| `accion` | VARCHAR(20) | NOT NULL | Tipo de operación: `INSERT`, `UPDATE` o `DELETE` |
| `tabla_afectada` | VARCHAR(60) | NOT NULL | Nombre de la tabla sobre la que se actuó |
| `registro_id` | INT | — | ID del registro afectado en la tabla correspondiente |
| `detalle` | TEXT | — | Descripción del cambio (valores anteriores/nuevos) |
| `fecha_hora` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha y hora exacta del servidor al momento del evento |
| `dir_IP` | VARCHAR(45) | — | Dirección IP desde la que se realizó la acción (soporta IPv4 e IPv6) |

---

## Catálogos (Patrón Lookup Table)

### `catalogo_maestro`

Implementa el patrón **Universal Lookup Table**: una sola tabla centraliza todos los catálogos parametrizables del sistema, evitando la creación de decenas de tablas separadas para tipos, estados y categorías.

El campo `grupo_catalogo` actúa como discriminador. Los grupos existentes son:

| `grupo_catalogo` | Valores de ejemplo |
|---|---|
| `TIPO_SESION` | Ordinaria, Extraordinaria |
| `TIPO_MODALIDAD` | Presencial, Virtual, Híbrida |
| `SECTOR` | Docente, Estudiante, Administrativo, Egresado |
| `NIVEL_REGLAMENTO` | Título, Capítulo, Artículo, Inciso, Sub-inciso |
| `ESTADO_PROPUESTA` | Borrador, Pendiente de Revisión, En Discusión, Aprobada, Rechazada |
| `ETAPA_PROPUESTA` | Procedencia, Aprobación, Dictamen |
| `TIPO_MAYORIA` | Simple, Calificada |
| `ESTADO_VIGENCIA` | Vigente, Histórico, Derogado |
| `TIPO_REFORMA` | Modificación, Derogación, Adición |
| `ESTADO_ASISTENCIA` | Presente, Ausente, Justificado |
| `TIPO_COMISION` | Permanente, Especial |
| `ROL_COMISION` | Presidente, Secretario, Vocal |
| `TIPO_TRAMITE` | Informe, Moción, Varios |
| `PUESTO` | Presidente del Directorio, Vicepresidente, Secretario, Fiscal, Representante |

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_item` | SERIAL | PK | Identificador único del ítem de catálogo |
| `grupo_catalogo` | VARCHAR(50) | NOT NULL | Categoría a la que pertenece el ítem (actúa como discriminador) |
| `nombre` | VARCHAR(100) | NOT NULL | Etiqueta visible del ítem |
| `activo` | BOOLEAN | NOT NULL, DEFAULT TRUE | Permite borrado lógico sin eliminar el registro |

> **Restricción:** UNIQUE sobre (`grupo_catalogo`, `nombre`), evitando duplicados dentro de un mismo grupo.

---

## Módulo 1: Identidad y Actores (Issues #9, #14)

### `asambleista`

Almacena la **identidad permanente** de cada representante. Esta tabla nunca cambia ante un cambio de sector o puesto; esas variaciones se registran en `nombramiento`. Si la persona cambia de nombre (por disposición del TSE), el cambio se registra en `bitacora_asambleistas`.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `asambleista_id` | SERIAL | PK | Identificador único del asambleísta |
| `cedula` | VARCHAR(20) | NOT NULL, UNIQUE | Número de cédula de identidad (admite formatos nacionales y extranjeros) |
| `nombre` | VARCHAR(150) | NOT NULL | Nombre completo actual |
| `correo_institucional` | VARCHAR(100) | UNIQUE | Correo del TEC (puede ser nulo para registros históricos) |

---

### `bitacora_asambleistas`

Registra el historial de cambios en los datos de identidad de un asambleísta. Existe por mandato del TSE, que permite cambios de nombre y cédula por razones de identidad de género o nacionalización.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_bitacora` | SERIAL | PK | Identificador único del registro histórico |
| `asambleista_id` | INT | NOT NULL, FK → `asambleista` | Persona cuya información fue modificada |
| `cedula_anterior` | VARCHAR(20) | — | Cédula antes del cambio (null si solo cambió el nombre) |
| `nombre_anterior` | VARCHAR(150) | — | Nombre antes del cambio (null si solo cambió la cédula) |
| `razon_cambio` | TEXT | NOT NULL | Justificación del cambio (ej. "Cambio de nombre por identidad de género según OC-24/17") |
| `fecha_actualizacion` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha en que se registró el cambio |

---

### `nombramiento`

Vincula a un asambleísta con su **sector y puesto durante un periodo específico**. Al ser temporal, permite conservar el historial completo de representación sin sobrescribir datos anteriores.

**Regla crítica:** No pueden existir dos nombramientos con estado `ACTIVO` para el mismo asambleísta en el mismo periodo. Esta restricción se refuerza mediante un trigger (`tg_traslape_sector`).

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_nombramiento` | SERIAL | PK | Identificador único del nombramiento |
| `asambleista_id` | INT | NOT NULL, FK → `asambleista` | Persona nombrada |
| `sector_id` | INT | NOT NULL, FK → `catalogo_maestro` | Sector que representa (grupo `SECTOR`) |
| `id_puesto` | INT | FK → `catalogo_maestro` | Puesto dentro del directorio, si aplica (grupo `PUESTO`) |
| `resolucion_id` | INT | — | ID de la resolución que formaliza el nombramiento |
| `fecha_inicio` | DATE | NOT NULL | Fecha de inicio del periodo de representación |
| `fecha_fin` | DATE | — | Fecha de finalización (null si el nombramiento está activo) |
| `estado` | VARCHAR(20) | NOT NULL, DEFAULT `'ACTIVO'` | Estado actual: `ACTIVO` o `FINALIZADO` |
| `id_usuario_registro` | INT | FK → `sys_usuario` | Usuario que registró el nombramiento en el sistema |
| `fecha_registro` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Timestamp de la inserción del registro |

> **Constraint:** `chk_fechas_nombramiento` — `fecha_fin` debe ser posterior a `fecha_inicio` si no es nula.

---

## Módulo 2: Jerarquía Normativa (Issue #10)

### `reglamento`

Es la entidad raíz de toda la normativa. Representa los reglamentos y estatutos formales del TEC que la AIR tiene competencia para reformar.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_reglamento` | SERIAL | PK | Identificador único del reglamento |
| `nombre_normativa` | VARCHAR(200) | NOT NULL | Nombre oficial completo del reglamento |
| `sigla` | VARCHAR(20) | NOT NULL, UNIQUE | Código abreviado para referencias (ej. `EOTEC`, `RAIR`) |

**Registros iniciales cargados en seed:**

| sigla | nombre_normativa |
|-------|-----------------|
| EOTEC | Estatuto Orgánico del ITCR |
| RAIR | Reglamento de la Asamblea Institucional Representativa |
| POLTEC | Políticas Generales del ITCR 2022-2026 |
| RDAIR | Reglamento del Directorio de la AIR |
| RCPTEC | Reglamento de Carrera Profesional del ITCR |

---

### `elemento_normativo`

**Tabla central del Módulo 2.** Implementa la estructura jerárquica completa de los reglamentos mediante una **relación recursiva** (`id_elemento_padre` apunta a `id_elemento` de la misma tabla). Esto permite representar cualquier nivel de profundidad: Título › Capítulo › Artículo › Inciso › Sub-inciso.

Cada elemento tiene un ciclo de vida: cuando se aprueba una reforma, el elemento anterior pasa a estado `Histórico` y se inserta uno nuevo como `Vigente`. El campo `fecha_fin_vigencia` en `NULL` indica que el elemento está actualmente vigente.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_elemento` | SERIAL | PK | Identificador único del elemento normativo |
| `id_reglamento` | INT | NOT NULL, FK → `reglamento` | Reglamento al que pertenece este elemento |
| `id_elemento_padre` | INT | FK → `elemento_normativo` (recursivo) | Elemento padre en la jerarquía (null si es Título raíz) |
| `id_nivel_reglamento` | INT | NOT NULL, FK → `catalogo_maestro` | Nivel jerárquico del elemento (grupo `NIVEL_REGLAMENTO`) |
| `numero_etiqueta` | VARCHAR(20) | NOT NULL | Identificador legal visible (ej. `18`, `a)`, `i.`) |
| `contenido_texto` | TEXT | — | Texto completo del artículo o inciso |
| `orden` | INT | NOT NULL | Posición secuencial dentro de su padre (el orden es información jurídica) |
| `fecha_inicio_vigencia` | DATE | NOT NULL | Fecha desde la que este texto es válido |
| `fecha_fin_vigencia` | DATE | — | Fecha en que dejó de estar vigente (null = actualmente vigente) |
| `id_estado_vigencia` | INT | NOT NULL, FK → `catalogo_maestro` | Estado del elemento: Vigente, Histórico o Derogado (grupo `ESTADO_VIGENCIA`) |

> **Constraint:** `chk_fechas_vigencia` — `fecha_fin_vigencia` debe ser posterior a `fecha_inicio_vigencia`.
>
> **Índice único parcial (`idx_elemento_vigente_unico`):** UNIQUE sobre (`id_elemento_padre`, `numero_etiqueta`) filtrado por `id_estado_vigencia = 'Vigente'` (resuelto vía subconsulta al `catalogo_maestro`). Esto implementa la **Regla de Oro**: no pueden existir dos versiones vigentes del mismo artículo con la misma etiqueta bajo el mismo padre simultáneamente. La condición se apoya en el catálogo en lugar de `fecha_fin_vigencia IS NULL` para mayor robustez.

---

## Módulo 3: Operatividad de Sesiones (Issues #10, #11, #12, #15)

### `sesiones`

Registra cada sesión plenaria de la AIR. El quórum requerido se define aquí para que el trigger `tg_validar_quorum` pueda verificar si la asistencia fue suficiente antes de permitir votaciones.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_sesion` | SERIAL | PK | Identificador único de la sesión |
| `id_tipo_modalidad` | INT | NOT NULL, FK → `catalogo_maestro` | Modalidad (grupo `TIPO_MODALIDAD`): Presencial, Virtual o Híbrida |
| `id_tipo_sesion` | INT | NOT NULL, FK → `catalogo_maestro` | Tipo de sesión (grupo `TIPO_SESION`): Ordinaria o Extraordinaria |
| `numero_sesion` | VARCHAR(20) | NOT NULL | Número identificador de la sesión (ej. `AIR-015-2026`) |
| `fecha` | DATE | NOT NULL | Fecha de realización |
| `link_acta` | TEXT | — | URL al documento del acta en el repositorio oficial del TEC |
| `quorum_requerido` | INT | NOT NULL | Número mínimo de asambleístas presentes para que la sesión sea válida |

---

### `acta`

Almacena el documento formal de cada sesión una vez aprobado. Un acta aprobada es inmutable; refleja la memoria histórica oficial de la AIR.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_acta` | SERIAL | PK | Identificador único del acta |
| `id_sesion` | INT | NOT NULL, FK → `sesiones` | Sesión a la que corresponde el acta |
| `fecha_aprobacion` | DATE | — | Fecha en que la sesión siguiente aprobó el acta (null si aún es borrador) |
| `url_documento` | TEXT | — | Enlace al PDF oficial del acta aprobada |
| `observaciones` | TEXT | — | Notas adicionales de la Secretaría |

---

### `propuesta`

Representa una moción o iniciativa de reforma. Puede ser una propuesta base o una propuesta conciliada que surge de varias propuestas anteriores (relación recursiva mediante `id_propuesta_padre`).

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_propuesta` | SERIAL | PK | Identificador único de la propuesta |
| `id_reglamento_base` | INT | FK → `reglamento` | Reglamento que la propuesta busca reformar (puede ser null para propuestas de política) |
| `id_etapa_propuesta` | INT | NOT NULL, FK → `catalogo_maestro` | Etapa actual (grupo `ETAPA_PROPUESTA`): Procedencia, Aprobación o Dictamen |
| `id_estado_propuesta` | INT | NOT NULL, FK → `catalogo_maestro` | Estado actual (grupo `ESTADO_PROPUESTA`): Borrador, En Discusión, Aprobada, etc. |
| `id_propuesta_padre` | INT | FK → `propuesta` (recursivo) | Propuesta de origen si esta es una conciliación de varias propuestas |
| `titulo` | VARCHAR(300) | NOT NULL | Título oficial de la propuesta |
| `texto_sustitutivo` | TEXT | — | Nuevo texto propuesto para sustituir al artículo o inciso vigente |
| `codigo_air` | VARCHAR(30) | — | Código oficial asignado por la AIR (ej. `AIR-99-2021`) |
| `id_tipo_mayoria_requerida` | INT | NOT NULL, FK → `catalogo_maestro` | Tipo de mayoría necesaria para aprobar (grupo `TIPO_MAYORIA`): Simple o Calificada (66%) |

---

### `bitacora_propuesta`

Registra cada cambio de estado o etapa en el ciclo de vida de una propuesta. Permite reconstruir el historial completo de deliberación de una moción.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_registro_bitacora` | SERIAL | PK | Identificador único del registro |
| `id_propuesta` | INT | NOT NULL, FK → `propuesta` | Propuesta cuyo estado cambió |
| `id_reglamento_base` | INT | FK → `reglamento` | Reglamento afectado en este momento del ciclo |
| `id_etapa_propuesta` | INT | NOT NULL, FK → `catalogo_maestro` | Etapa al momento del cambio |
| `id_estado_propuesta` | INT | NOT NULL, FK → `catalogo_maestro` | Estado al momento del cambio |
| `titulo` | VARCHAR(300) | NOT NULL | Título de la propuesta en ese momento |
| `codigo_air` | VARCHAR(30) | — | Código AIR en ese momento del ciclo |
| `fecha_modificacion` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha y hora del cambio de estado |
| `usuario_modificacion` | INT | FK → `sys_usuario` | Usuario que realizó el cambio |

---

### `proponente_propuesta`

Tabla intermedia que implementa la relación N:M entre propuestas y asambleístas. Una propuesta puede tener múltiples proponentes, y un asambleísta puede haber propuesto múltiples reformas.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_proponente_propuesta` | SERIAL | PK | Identificador único del vínculo |
| `id_propuesta` | INT | NOT NULL, FK → `propuesta` | Propuesta a la que se vincula el proponente |
| `id_asambleista` | INT | NOT NULL, FK → `asambleista` | Asambleísta que figura como proponente |
| `fecha_registro` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha en que se registró la autoría |

> **Restricción:** UNIQUE sobre (`id_propuesta`, `id_asambleista`), evitando que el mismo asambleísta aparezca dos veces como proponente de la misma propuesta.

---

### `punto_agenda`

Define los ítems discutidos en una sesión específica. Sin este puente, no existe trazabilidad de qué se trató en qué sesión. El campo `orden` es jurídicamente relevante: define la secuencia de discusión.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_punto_agenda` | SERIAL | PK | Identificador único del punto de agenda |
| `id_sesion` | INT | NOT NULL, FK → `sesiones` | Sesión en la que se trató el punto |
| `id_propuesta` | INT | NOT NULL, FK → `propuesta` | Propuesta asociada a este punto |
| `orden` | INT | NOT NULL | Posición del punto en el orden del día |
| `descripcion` | TEXT | — | Descripción adicional del punto de agenda |

---

### `resolucion`

Formaliza el número oficial de acuerdo que resulta de la deliberación de un punto de agenda. Este número es el que aparece en las certificaciones y en los documentos legales.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_resolucion` | SERIAL | PK | Identificador único de la resolución |
| `id_sesion` | INT | NOT NULL, FK → `sesiones` | Sesión en la que se emitió |
| `id_punto_agenda` | INT | NOT NULL, FK → `punto_agenda` | Punto de agenda que originó la resolución |
| `numero_resolucion` | VARCHAR(30) | NOT NULL, UNIQUE | Número oficial (ej. `AIR-RES-005-2026`) |
| `fecha_emision` | DATE | NOT NULL | Fecha de emisión formal de la resolución |

---

### `asistencia_sesion_plenaria`

Registra si cada asambleísta estuvo presente, ausente o justificado en una sesión. Es la base de datos de la que se extraen los porcentajes de asistencia para las certificaciones.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_asistencia` | SERIAL | PK | Identificador único del registro de asistencia |
| `id_asambleista` | INT | NOT NULL, FK → `asambleista` | Asambleísta al que corresponde el registro |
| `id_sesion` | INT | NOT NULL, FK → `sesiones` | Sesión en la que se registró la asistencia |
| `id_estado_asistencia` | INT | NOT NULL, FK → `catalogo_maestro` | Estado de asistencia (grupo `ESTADO_ASISTENCIA`): Presente, Ausente o Justificado |

> **Restricción:** UNIQUE sobre (`id_asambleista`, `id_sesion`): un asambleísta solo puede tener un registro de asistencia por sesión.

---

## Módulo 5: Certificaciones y Reformas (Issue #15)

### `reforma_aplicada`

Conecta una resolución oficial con el cambio concreto en un elemento normativo. Almacena el texto anterior y el nuevo, creando la trazabilidad de evolución del artículo. Al insertar un registro aquí, el trigger `tg_vigencia_normativa` marca automáticamente el elemento anterior como `Histórico`.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_reforma` | SERIAL | PK | Identificador único de la reforma aplicada |
| `id_resolucion` | INT | NOT NULL, FK → `resolucion` | Resolución que respalda legalmente el cambio |
| `id_elemento_normativo` | INT | NOT NULL, FK → `elemento_normativo` | Elemento que fue modificado, derogado o al que se le hizo una adición |
| `id_tipo_reforma` | INT | NOT NULL, FK → `catalogo_maestro` | Naturaleza del cambio (grupo `TIPO_REFORMA`): Modificación, Derogación o Adición |
| `texto_anterior` | TEXT | — | Texto que estaba vigente antes del cambio (para trazabilidad histórica) |
| `texto_nuevo` | TEXT | NOT NULL | Texto que entra en vigencia con esta resolución |
| `fecha_inicio_vigencia` | DATE | NOT NULL, DEFAULT CURRENT_DATE | Fecha desde la que rige el nuevo texto |

---

### `control_folio`

Garantiza que la numeración de certificaciones sea **atómica y sin saltos**. Antes de emitir una certificación, el sistema hace un `LOCK` sobre esta tabla, obtiene el último número, lo incrementa y solo entonces genera el folio. Hay un registro por año fiscal.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_control` | SERIAL | PK | Identificador único del registro de control |
| `anio` | INT | NOT NULL, UNIQUE | Año fiscal al que corresponde el contador |
| `ultimo_numero` | INT | NOT NULL, DEFAULT 0 | Último número de folio asignado en ese año |
| `fecha_actualizacion` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Momento de la última asignación de folio |

> **Ejemplo de uso:** Para emitir el folio `DAIR-010-2026`, el sistema consulta el registro donde `anio = 2026`, obtiene `ultimo_numero = 9`, suma 1, forma el folio y actualiza el contador en una única transacción.

---

### `certificacion_emitida`

Registro permanente de cada certificación generada. El hash SHA-256 asegura la integridad del documento: cualquier alteración posterior invalida la firma. Este registro es **inmutable** por mandato del trigger `tg_no_repudio_cert`.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_certificacion` | SERIAL | PK | Identificador único de la certificación |
| `id_asambleista` | INT | NOT NULL, FK → `asambleista` | Asambleísta sobre quien se emite la certificación |
| `folio_unico` | VARCHAR(30) | NOT NULL, UNIQUE | Número de folio institucional (formato `DAIR-NNN-YYYY`) |
| `hash_seguridad` | VARCHAR(64) | — | Huella digital SHA-256 del contenido del documento |
| `fecha_emision` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha y hora exacta de emisión |
| `usuario_secretaria` | INT | NOT NULL, FK → `sys_usuario` | Usuario de la Secretaría que autorizó la emisión |

---

### `anulacion_certificacion`

Registra la invalidación de un folio. El número anulado **nunca se reutiliza**; solo cambia su estado a inválido. Cualquier tercero que intente verificar ese folio verá el mensaje de anulación.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id_anulacion` | SERIAL | PK | Identificador único de la anulación |
| `certificacion_id` | INT | NOT NULL, UNIQUE, FK → `certificacion_emitida` | Certificación que se está anulando |
| `motivo` | TEXT | NOT NULL | Justificación obligatoria de la anulación |
| `fecha` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Fecha y hora del registro de anulación |

> **Restricción UNIQUE** sobre `certificacion_id`: una certificación solo puede anularse una vez.

---

## Triggers Implementados

| Trigger | Tabla | Evento | Descripción |
|---------|-------|--------|-------------|
| `tg_vigencia_normativa` | `reforma_aplicada` | BEFORE INSERT | Al registrar una reforma, marca el elemento normativo anterior como `Histórico` y le asigna `fecha_fin_vigencia`. Garantiza que nunca existan dos versiones vigentes del mismo artículo. |
| `tg_no_repudio_cert` | `certificacion_emitida` | BEFORE UPDATE / DELETE | Bloquea cualquier intento de modificar o eliminar una certificación ya emitida. Implementa el principio de fe pública e inalterabilidad. |
| `tg_auditoria_total` | `asambleista`, `nombramiento`, `resolucion` | AFTER INSERT / UPDATE / DELETE | Registra automáticamente en `sys_log_auditoria` el usuario, fecha, hora y detalle de cada cambio en datos sensibles. |
| `tg_validar_quorum` | tabla de votos | BEFORE INSERT | Verifica que el conteo de asistencia en la sesión cumpla el `quorum_requerido` antes de permitir el registro de un voto. |
| `tg_traslape_sector` | `nombramiento` | BEFORE INSERT | Impide que un asambleísta tenga dos nombramientos activos en el mismo periodo de tiempo. |
| `tg_folio_secuencial` | `certificacion_emitida` | BEFORE INSERT | Genera y asigna de forma atómica el siguiente folio desde `control_folio`, previniendo duplicados en entornos concurrentes. |

---

## Relaciones Clave del Modelo

```
sys_usuario ──N:M──► sys_rol ──N:M──► sys_permiso
sys_usuario ──1:N──► sys_log_auditoria

asambleista ──1:N──► nombramiento
asambleista ──1:N──► bitacora_asambleistas
asambleista ──N:M──► propuesta  (vía proponente_propuesta)

reglamento ──1:N──► elemento_normativo
elemento_normativo ──1:N──► elemento_normativo  (recursivo: padre → hijos)

sesiones ──1:N──► punto_agenda ──N:1──► propuesta
sesiones ──1:1──► acta
sesiones ──1:N──► asistencia_sesion_plenaria
punto_agenda ──1:1──► resolucion ──1:N──► reforma_aplicada

reforma_aplicada ──N:1──► elemento_normativo
certificacion_emitida ──N:1──► asambleista
certificacion_emitida ──1:1──► anulacion_certificacion
control_folio ──(LOCK atómico)──► certificacion_emitida
```

---

*Documento generado para el Sprint 2 del Sistema de Gestión Legislativa AIR — TEC*
