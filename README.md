<div align="center">

# 🏛️ Sistema de Gestión Legislativa · AIR

### *Modernización del Sistema de Gestión Documental y Normativa*
### *Secretaría de la Asamblea Institucional Representativa — TEC*

---

| Sprint | Rama | Estado |
|:---:|:---:|:---:|
| 🔧 Sprint 2 — Cimientos y Datos | `develop` | 🟡 En desarrollo |
| 🚀 Sprint 3 — Lógica y Certificación | `main` | ⏳ Pendiente |

</div>

---

##  ¿Qué es este proyecto?

La Asamblea Institucional Representativa del TEC gestiona actualmente su memoria histórica mediante archivos aislados y procesos manuales, lo que representa un riesgo directo para la **fe pública institucional**. Este sistema nace para erradicar esa fragmentación.

> *"Un acuerdo mal certificado no es un error administrativo. Es un problema jurídico."*

Este sistema automatiza la **trazabilidad legislativa completa**: desde que un asambleísta presenta una moción, hasta que la Secretaría emite una certificación oficial con validez institucional, garantizando que cada documento emitido sea **veraz, inalterable y refleje la normativa vigente en tiempo real**.

---

## ⚡ Propuesta de Valor

| Actor | Beneficio Principal |
|---|---|
| 🗂️ **Secretaría AIR** | Eliminación del foliado manual y automatización de certificaciones. El sistema impide certificar artículos derogados. |
| 📊 **Directorio** | Visibilidad total sobre quórum legal y resultados de votaciones sin cálculos manuales. |
| 👤 **Asambleístas** | Acceso inmediato a historial de participación, asistencia y atestados para carrera profesional. |
| 🎓 **Comunidad TEC** | Un Compilador Normativo que muestra el estado real de cualquier reglamento en cualquier punto de su historia. |

---

## 🧩 Módulos del Sistema

### `Módulo 1` — 🪪 Gestión de Identidad y Roles
Registro de asambleístas con validación de cédula e historial de nombramientos por sector. Control de acceso basado en roles **(RBAC)** para Secretaría, Directorio y Asambleístas. Sin datos de personas, no hay trazabilidad.

### `Módulo 2` — 📜 Estructura Normativa y Recursividad
Jerarquía recursiva de reglamentos con soporte para reformas que derogan o modifican versiones anteriores, manteniendo el historial completo intacto.

```
Reglamento
└── Título
    └── Capítulo
        └── Artículo
            └── Inciso
```

### `Módulo 3` — 🗳️ Operatividad de Sesiones
Control de quórum en tiempo real, registro de asistencia, motor de votaciones nominales y secretas con cálculo automático de mayorías simples y **calificadas al 66%**, más bitácora de auditoría forense de todas las acciones del sistema.

### `Módulo 4` — 🔍 Compilador Normativo
Visor de vigencia que muestra únicamente la ley activa a una fecha dada, ocultando artículos derogados y permitiendo consultas históricas sobre cualquier punto en el tiempo.

### `Módulo 5` — 🔏 Fe Pública y Certificación
Generador de atestados oficiales en PDF con **Folio Único institucional** (formato `DAIR-000-AÑO`) y firma **Hash SHA-256** que garantiza el no repudio e inalterabilidad del documento emitido.

---

## 🏗️ Arquitectura MVC

El proyecto implementa el patrón **Modelo — Vista — Controlador** con separación estricta de responsabilidades. No se acepta lógica SQL en las vistas ni HTML en los controladores.

```
src/
├── 📁 config/          → Conexión a PostgreSQL y configuración de sesiones JWT
├── 📁 models/          → Consultas SQL, triggers y lógica de integridad de datos
├── 📁 controllers/     → Lógica legal (quórum, mayorías, seguridad, certificaciones)
├── 📁 views/           → Interfaces HTML/CSS/JS para interacción con el usuario
│   ├── 📁 asambleistas/
│   ├── 📁 normativa/
│   ├── 📁 sesiones/
│   ├── 📁 certificaciones/
│   └── 📁 shared/
├── 📁 services/        → Utilidades transversales (SHA-256, generación de PDF)
├── 📁 logs/            → Archivos de auditoría (Issue #13)
└── 📁 tests/           → Pruebas unitarias de quórum y mayorías
```

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| 🗄️ Base de datos | PostgreSQL 15 | Esquema relacional, triggers y funciones almacenadas |
| ⚙️ Backend | Node.js + Express | API REST y lógica de negocio |
| 🖥️ Frontend | HTML5 + CSS3 + JS vanilla | Interfaces del usuario |
| 🔐 Autenticación | JWT | Control de sesiones y roles |
| 📄 Generación PDF | PDFKit | Emisión de certificaciones oficiales |
| 🌿 Versiones | Git Flow + GitHub | Trazabilidad y entrega del proyecto |

---

## 🔐 Blindaje de Datos — Triggers

El núcleo de integridad del sistema está programado directamente en la base de datos mediante triggers, garantizando que las reglas de negocio no dependan del error humano.

| Trigger | Propósito |
|---|---|
| `tg_vigencia_normativa` | Versiona automáticamente artículos al insertar una reforma |
| `tg_no_repudio_cert` | Bloquea cualquier modificación o borrado de certificaciones emitidas |
| `tg_auditoria_total` | Registra usuario, fecha y cambios antes/después en datos sensibles |
| `tg_validar_quorum` | Impide votar si la sesión no alcanza el quórum mínimo legal |
| `tg_traslape_sector` | Rechaza nombramientos con traslape de fechas en el mismo sector |
| `tg_folio_secuencial` | Genera folios únicos de forma atómica para evitar duplicados |

---

## 🚀 Instalación Local

### Requisitos previos

- Node.js v18 o superior
- PostgreSQL v15 o superior
- Git


---

## 🌿 Flujo de Trabajo Git

Este proyecto sigue **Git Flow** con protecciones activas en `main` y `develop`. Toda contribución entra por Pull Request, sin excepción.

```bash
# Actualizar develop antes de empezar
git checkout develop
git pull origin develop

# Crear rama del issue
git checkout -b feature/issue-09-catalogo-asambleistas

# Commitear con formato obligatorio
git commit -m "feat(#9): agregar formulario de registro de asambleísta"

# Rebase antes del PR (paso crítico)
git rebase origin/develop

# Subir y abrir PR hacia develop
git push origin feature/issue-09-catalogo-asambleistas
```

> Para el detalle completo de reglas, convenciones de commits y manejo de conflictos ver [`reglas_git.md`](./reglas_git.md).

---

## 📋 Issues y Progreso

| Issue | Descripción | Sprint | Estado |
|:---:|---|:---:|:---:|
| `#0` | 🔐 Seguridad RBAC | Sprint 2 | ✅ |
| `#9` | 👤 Catálogo de Asambleístas | Sprint 2 | ✅ |
| `#10` | 📜 Jerarquía de Reglamentos | Sprint 2 | ✅ |
| `#14` | 🗂️ Historial de Nombramientos | Sprint 2 | ✅ |
| `#15` | ✏️ Gestión de Reformas | Sprint 2 | ✅ |
| `#11` | 🗳️ Control de Quórum | Sprint 3 | ✅ |
| `#12` | ⚖️ Motor de Votaciones | Sprint 3 | ✅ |
| `#13` | 📋 Bitácora de Auditoría | Sprint 3 | ✅ |
| `#16` | 🔍 Visor de Vigencia | Sprint 3 | ✅ |
| `#17` | 🔏 Generador de Atestados | Sprint 3 | ✅ |

---

## 👥 Equipo de Desarrollo

<div align="center">

| 👩‍💻 Nathaly Gamboa | 👨‍💻 Sebastián Jiménez | 👨‍💻 Elías Quirós |


</div>

---

## 📄 Licencia

Proyecto académico desarrollado para el curso de **TI3600 Bases de datos** — Instituto Tecnológico de Costa Rica.
Todos los derechos reservados © 2025.

---

<div align="center">


</div>

