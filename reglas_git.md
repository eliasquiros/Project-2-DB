# Filosofia Base
1. Ningun cambio llega a main o develop sin que se haya revisado por otro compañero, si se realiza 
 Un pull request, otra persona debe revisar que cumpla lo solicitado, sin excepción.
2. Un commit se enfoca en una sola cosa, no puede haber en un mismo commit una corrección, agregar algo, o trabajar en archivos distintos

# Estructura de Ramas
 Para cada funcionalidad que se vaya a trabajar, se trabajará por ramas, donde luego al terminar la funcionalidad y probar que está completamente correcta, se hace merge a develop y se elimina la rama anterior.
No se hacen pull request a main, siempre a develop, y mucho cuidado con trabajar directamente en la rama develop.

 Para crear una rama, usar este nombre siempre feature/funcionalidad o rama. Ej. feature/issue-00-seguridad-rbac

# Convencion de commits

Los commits se realizan usando verbos en infinitivo, no nada de agregué o agregando

## Tipos de commits
1. **feat** se usa cuando se agrega funcionalidad nueva al sistema. Un formulario nuevo, un endpoint nuevo, una tabla nueva en la base de datos que antes no existía.
2. **fix** se usa cuando se corrige un error existente. Algo que estaba roto y ahora funciona.
3. **db** se usa exclusivamente para cambios en archivos SQL: crear o modificar tablas, insertar datos semilla, agregar triggers, crear funciones almacenadas o modificar el esquema.
4. **style** se usa para cambios puramente visuales en HTML o CSS que no afectan la lógica de la aplicación. Cambiar colores, márgenes, fuentes o layouts.
5. **refactor** se usa cuando se reorganiza o reescribe código sin cambiar lo que hace externamente. Mejorar la legibilidad, extraer una función repetida, renombrar variables para que sean más claras.
6. **docs** se usa para cambios en archivos de documentación: README, REGLAS_GIT, manual técnico, diccionario de datos o cualquier archivo .md.
7. **test** se usa al agregar o modificar pruebas del sistema
8. **chore** se usa para tareas de mantenimiento que no afectan el código de producción: actualizar dependencias en package.json, modificar el .gitignore, configurar variables de entorno.

### Ej
feat(#9): agregar formulario de registro de asambleísta

## No se acepta
arreglé cosas
fix bugs

Todo commit debe poder ser rastreable y saber masomenos que hizo solo con leer su título

# Flujo trabajo diario

## Inicio de jornada
Antes de escribir una sola línea de código, actualizar develop local para tener los cambios que los compañeros mergearon:

git checkout develop
git pull origin develop

y cambian a la rama que van a trabajar, ahí agregan, hacen los commits, y cuando van a hacer el pull request(PR), hacen esto:

git fetch origin
git rebase origin/develop

luego suben de su local a la rama en github

git push origin feature/issue-09-catalogo-asambleistas

luego pull request hacia develop

cuando terminan la rama:

git branch -d feature/issue-09-catalogo-asambleistas

# Pull Request

## Reglas obligatorias
Mínimo una aprobación de un compañero antes de hacer merge. El autor del PR no puede aprobarse a sí mismo. El PR debe referenciar su issue con Closes #9 en la descripción para que GitHub lo cierre automáticamente al mergear. No se hace merge si hay conflictos sin resolver. Una vez aprobado, el autor hace el merge, no el revisor.
## Qué verifica el revisor
El revisor debe confirmar que la lógica SQL está solo en los modelos, que no hay consultas a la base de datos dentro de los controladores ni en las vistas, que no hay etiquetas HTML dentro de los archivos de controlador, que el código funciona localmente antes de aprobar, y que los commits de la rama siguen el formato establecido.
Plantilla obligatoria de descripción del PR
Al abrir el PR en GitHub, copiar y completar esta plantilla en la descripción:

## ¿Qué hace este PR?
Descripción breve y clara de los cambios realizados.

## Issue relacionado
Closes #[número]

## Checklist
- [ ] El código sigue la arquitectura MVC estrictamente
- [ ] No hay lógica SQL en las vistas ni en los controladores
- [ ] No hay HTML en los controladores
- [ ] Probé que funciona localmente antes de subir
- [ ] Los commits siguen el formato establecido en REGLAS_GIT.md
- [ ] Moví la tarjeta del issue a "In Review" en el tablero Kanban

# Manejo de conflictos

Pasos para resolverlos correctamente:
Primero, abrir el archivo en el editor de código. El editor generalmente resalta los conflictos visualmente.
Segundo, leer ambas versiones y entender qué hace cada una. Si no se entiende el código del compañero, preguntarle antes de borrarlo.
Tercero, dejar el código correcto. A veces es una versión, a veces la otra, a veces una combinación de ambas.
Cuarto, eliminar completamente las líneas marcadoras: la línea <<<<<<<, la línea ======= y la línea >>>>>>>. Esas líneas no son código, son marcadores de Git y no deben quedar en el archivo final.
Quinto, guardar el archivo y continuar:

Igualmente, siempre que ocurra uno, comunicarlo primero con el grupo para no seguir haciendo merge hasta que se solucione, no fuercen nada mejor porque puede arruinar el code de otro

# Tablero Kanban

Columnas y su significado
Backlog contiene todos los issues definidos y documentados que aún no han sido iniciados. Al crear un issue en GitHub, va aquí primero.
In Progress indica que hay una rama activa para ese issue con al menos un commit. Mover la tarjeta aquí el mismo día que se crea la rama.
In Review indica que el PR está abierto y esperando aprobación de un compañero. Mover la tarjeta aquí el mismo día que se abre el PR.
Done indica que el PR fue aprobado y mergeado a la rama oficial del sprint. Issue que no esté aquí con su código en la rama oficial no cuenta como entregado para la evaluación.
Responsabilidad individual
Cada integrante mueve sus propias tarjetas. No es responsabilidad de otro compañero ni del líder mover las tarjetas ajenas. Descuidar el tablero tiene el mismo impacto en la nota que no escribir el código.

