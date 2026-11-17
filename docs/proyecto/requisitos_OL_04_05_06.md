# Requisitos QA — HU-04, HU-05, HU-06 (Outline)

Este documento conserva las definiciones y los campos utilizados para registrar los requisitos durante la preparación inicial. El estado Borrador describe esa etapa. La consulta del 16 de noviembre de 2026 utilizada en el informe registra los tres requisitos aprobados en QAtlas. La guía de entrega reúne el estado de ejecución de sus casos y las comprobaciones pendientes. [Consultar la guía de pruebas](ejecuciones_HU_04_05_06.md).

**Propietario:** Joseph Andres Fonseca Nuñez
**Fuente:** Planificación Fase 1 (alcance oficial), renumerada del 1 al 9 por el equipo.
**Uso:** pegar campo por campo en QAtlas → Nuevo requisito. Formato: Historia de usuario. Estado: Borrador.
**QAtlas:** https://geotorotur.tail052473.ts.net/qatlas/requirements

## Mapeo de HU-04, HU-05 y HU-06

El equipo trabaja con nueve historias, de HU-01 a HU-09, y nueve requisitos de QAtlas, de OL-4 a OL-12. El alcance de Joseph corresponde a los tres vínculos siguientes. [Consultar los nueve requisitos del equipo](requisitos.csv).

- **OL-4 = HU-04 — Crear documento (mío)**
- **OL-5 = HU-05 — Auto-save en editor (mío)**
- **OL-6 = HU-06 — Resolver y editar comentarios (mío)**

---

## REQ OL-4 — HU-04 — Crear documento

- **Título:** `HU-04 — Crear documento`
- **Formato:** Historia de usuario
- **Estado:** Borrador
- **Prioridad:** Alta
- **Como (rol):** `editor`
- **Quiero:** `crear un nuevo documento en una colección con título por defecto`
- **Para:** `empezar a documentar inmediatamente.`

### Precondiciones (2)

1. `El usuario tiene rol editor con permisos de escritura en la colección destino.`
2. `Existe al menos una colección disponible en el workspace.`

### Flujo principal / Happy Path (3 pasos)

1. `El editor hace clic en "Nuevo documento" dentro de una colección.`
2. `El sistema crea el documento con título por defecto y abre el editor.`
3. `El editor escribe y el sistema muestra el estado de guardado.`

### Criterios de aceptación (2)

1. `CA-04.1: Dado un editor en un documento nuevo, cuando empieza a escribir y deja de hacerlo durante >2 segundos, entonces el indicador cambia a "guardando…" y al completarse a "Guardado hh:mm:ss" en ≤2,5 s desde la última pulsación.`
2. `CA-04.2: Dado un viewer, cuando intenta realizar un POST /api/documents.create, entonces el servidor responde con código de error 403.`

---

## REQ OL-5 — HU-05 — Auto-save en editor

- **Título:** `HU-05 — Auto-save en editor`
- **Formato:** Historia de usuario
- **Estado:** Borrador
- **Prioridad:** Alta
- **Como (rol):** `editor`
- **Quiero:** `que el documento se guarde automáticamente`
- **Para:** `no perder trabajo.`

### Precondiciones (3)

1. `El editor está autenticado en un documento existente con cambios sin guardar.`
2. `Hay conexión a red al iniciar (para CA-05.1; para CA-05.3 se simula corte).`
3. `El documento permite escritura (no es solo lectura).`

### Flujo principal / Happy Path (3 pasos)

1. `El editor modifica el contenido del documento.`
2. `Transcurren 2 segundos sin actividad de escritura (debounce 2000ms).`
3. `El sistema guarda vía PATCH documents.update y muestra "Guardado hh:mm:ss".`

### Criterios de aceptación (4)

1. `CA-05.1: Dado un editor con cambios sin guardar, cuando transcurren 2 segundos sin actividad (debounce 2000ms), entonces el sistema guarda con PATCH documents.update y muestra "Guardado hh:mm:ss".`
2. `CA-05.2: Dado un editor con cambios pendientes, cuando cierra la pestaña o abandona la página (beforeunload), entonces el sistema despacha un navigator.sendBeacon con el último estado pendiente.`
3. `CA-05.3: Dado un fallo de guardado por interrupción de red, cuando se recupera la conexión (evento online), entonces el sistema reintenta con retroceso exponencial (1s/3s/9s, máx. 3 intentos) de forma transparente.`
4. `CA-05.4: Dado dos editores modificando el mismo párrafo offline, cuando ambos recuperan conexión y sincronizan, entonces Y.js aplica resolución CRDT manteniendo ambos aportes sin pérdida (merge automático).`

---

## REQ OL-6 — HU-06 — Resolver y editar comentarios

- **Título:** `HU-06 — Resolver y editar comentarios`
- **Formato:** Historia de usuario
- **Estado:** Borrador
- **Prioridad:** Alta
- **Como (rol):** `editor`
- **Quiero:** `resolver comentarios cuando la discusión termina y editar mis propios comentarios`
- **Para:** `mantener la conversación limpia.`

### Precondiciones (2)

1. `Existe un documento con comentarios activos y el usuario tiene permiso de comentar/editar.`
2. `Para CA-06.4 existe un comentario del usuario "Y" y un usuario "X" autenticado no autor.`

### Flujo principal / Happy Path (3 pasos)

1. `El autor o editor con permisos abre un comentario existente.`
2. `Edita el contenido, lo resuelve o lo elimina según corresponda.`
3. `El sistema actualiza timestamp/estado y refleja el cambio en el listado.`

### Criterios de aceptación (4)

1. `CA-06.1: Dado un comentario existente, cuando el autor o un editor con permisos accede a comments.update, entonces el sistema actualiza el contenido y registra el timestamp de modificación.`
2. `CA-06.2: Dado un comentario creado, cuando el autor invoca comments.delete, entonces se aplica borrado lógico (soft delete) y deja de mostrarse en el listado.`
3. `CA-06.3: Dado un comentario activo, cuando un editor ejecuta comments.resolve, entonces el campo resolvedAt se actualiza y la interfaz lo categoriza como "Resuelto".`
4. `CA-06.4: Dado un usuario "X" que no es autor, cuando intenta POST comments.update sobre comentario de "Y", entonces el servidor responde 403 con id: authorization_error.`

---

## Orden de carga inicial en QAtlas

1. OL-4 con título `HU-04 — Crear documento`.
2. OL-5 con título `HU-05 — Auto-save en editor`.
3. OL-6 con título `HU-06 — Resolver y editar comentarios`.
4. Requisito padre: vacío. Dueño: vos.

La carga inicial vinculó veinte casos a OL-4, OL-5 y OL-6, con dieciocho automatizados y dos manuales en C1. La ejecución de C2 automatiza los veinte casos con Playwright. [Consultar las ejecuciones y la trazabilidad](ejecuciones_HU_04_05_06.md).
