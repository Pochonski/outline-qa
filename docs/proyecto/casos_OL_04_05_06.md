# Casos de prueba — HU-04 / HU-05 / HU-06 (20 casos)

Este documento conserva el diseño inicial de los veinte casos y sus campos de preparación de C1. En C2, Playwright automatiza los veinte casos, incluidos CP-HU04-06 y CP-HU05-02. La guía de ejecución relaciona cada código OL-TC con su archivo actual, su resultado histórico y las comprobaciones pendientes. Los identificadores de automatización consignados en el diseño corresponden a la planificación inicial. [Consultar la trazabilidad de C2](ejecuciones_HU_04_05_06.md).

**Propietario:** Joseph Andres Fonseca Nuñez
**Mapeo:** OL-4 = HU-04 Crear documento · OL-5 = HU-05 Auto-save en editor · OL-6 = HU-06 Resolver y editar comentarios
**Regla:** 18 automatizados + 2 manuales (10%). Estado inicial en QAtlas: Borrador.
**Convención:** `CP-HUxx-NN`. Tipo de Prueba: Funcional / Seguridad / Integración. Tipo de ejecución: Automatizada / Manual.
**Formato de pasos QAtlas:** cada paso lleva Acción + Resultado esperado + Datos de prueba (opcional).

---

## HU-04 — Crear documento (OL-4 · 6 casos: 5 auto + 1 manual)

### CP-HU04-01 – Crear documento como editor

- **Descripción / objetivo:** Verifica que un editor crea un documento con título por defecto. Cubre CA-04.1.
- **Precondiciones:** Editor autenticado con escritura en la colección. Existe colección destino.
- **Estado:** Borrador. **Prioridad:** Alta. **Tipo de Prueba:** Funcional. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-4. **Id de automatización:** `documents.create.spec.ts::"crea con Sin título"`.
- **Etiquetas:** HU-04, CA-04.1, valida, auto. **Requisitos vinculados:** OL-4.
- **Pasos:**
  1. **Acción:** Enviar POST `/api/documents.create` con un `collectionId` válido.
     **Resultado esperado:** Responde 200.
     **Datos de prueba:** `collectionId` de una colección existente, rol editor.
  2. **Acción:** Revisar el payload de la respuesta.
     **Resultado esperado:** `title="Sin título"` y el editor queda abierto.
     **Datos de prueba:** (vacío).

### CP-HU04-02 – Crear documento sin colección destino

- **Descripción:** Sin `collectionId` rechaza con 400, no crea nada. Caso inválido.
- **Precondiciones:** Editor autenticado.
- **Estado:** Borrador. **Prioridad:** Media. **Tipo de Prueba:** Funcional. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-4. **Id:** `documents.create.spec.ts::"rechaza sin collectionId"`.
- **Etiquetas:** HU-04, invalida, auto. **Requisitos:** OL-4.
- **Pasos:**
  1. **Acción:** Enviar POST `/api/documents.create` sin `collectionId`.
     **Resultado esperado:** Responde 400 y se crean 0 documentos.
     **Datos de prueba:** body sin `collectionId`, rol editor.

### CP-HU04-03 – Viewer intenta crear documento

- **Descripción:** RBAC: viewer recibe 403. Cubre CA-04.2.
- **Precondiciones:** Usuario con rol viewer autenticado.
- **Estado:** Borrador. **Prioridad:** Alta. **Tipo de Prueba:** Seguridad. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-4. **Id:** `documents.create.spec.ts::"viewer 403"`.
- **Etiquetas:** HU-04, CA-04.2, seguridad, auto. **Requisitos:** OL-4.
- **Pasos:**
  1. **Acción:** Enviar POST `/api/documents.create` como viewer con `collectionId` válido.
     **Resultado esperado:** Responde 403 con `id: authorization_error`.
     **Datos de prueba:** rol viewer, `collectionId` válido.

### CP-HU04-04 – Crear documento sin token

- **Descripción:** Sin autenticación responde 401.
- **Precondiciones:** Sin sesión.
- **Estado:** Borrador. **Prioridad:** Alta. **Tipo de Prueba:** Seguridad. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-4. **Id:** `documents.create.spec.ts::"401 sin token"`.
- **Etiquetas:** HU-04, seguridad, auto. **Requisitos:** OL-4.
- **Pasos:**
  1. **Acción:** Enviar POST `/api/documents.create` sin token.
     **Resultado esperado:** Responde 401.
     **Datos de prueba:** (vacío).

### CP-HU04-05 – Guest intenta crear documento

- **Descripción:** Rol guest recibe 403.
- **Precondiciones:** Guest autenticado.
- **Estado:** Borrador. **Prioridad:** Media. **Tipo de Prueba:** Seguridad. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-4. **Id:** `documents.create.spec.ts::"guest 403"`.
- **Etiquetas:** HU-04, seguridad, auto. **Requisitos:** OL-4.
- **Pasos:**
  1. **Acción:** Enviar POST `/api/documents.create` como guest.
     **Resultado esperado:** Responde 403.
     **Datos de prueba:** rol guest.

### CP-HU04-06 – Indicador guardando visible [MANUAL 1/2]

- **Descripción:** Al escribir y pausar >2 s muestra "guardando…" y luego "Guardado hh:mm:ss" en ≤2,5 s. Cubre CA-04.1.
- **Precondiciones:** Editor en documento nuevo. Cronómetro a mano.
- **Estado:** Borrador. **Prioridad:** Media. **Tipo de Prueba:** Funcional. **Tipo de ejecución:** Manual.
- **Carpeta:** OL-4. **Id:** (vacío).
- **Etiquetas:** HU-04, CA-04.1, manual, ux. **Requisitos:** OL-4.
- **Pasos:**
  1. **Acción:** Escribir en el documento y soltar el teclado.
     **Resultado esperado:** Aparece el indicador "guardando…".
     **Datos de prueba:** documento nuevo vacío.
  2. **Acción:** Esperar a que termine el guardado.
     **Resultado esperado:** Muestra "Guardado hh:mm:ss" en ≤2,5 s desde la última pulsación.
     **Datos de prueba:** cronómetro.

---

## HU-05 — Auto-save en editor (OL-5 · 7 casos: 6 auto + 1 manual)

### CP-HU05-01 – Debounce 2 s dispara guardado

- **Descripción:** Tras 2 s sin escribir se emite 1 PATCH `documents.update`. Cubre CA-05.1.
- **Precondiciones:** Editor con cambios sin guardar.
- **Estado:** Borrador. **Prioridad:** Alta. **Tipo de Prueba:** Funcional. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-5. **Id:** `documents.update.spec.ts::"debounce 2000ms"`.
- **Etiquetas:** HU-05, CA-05.1, auto. **Requisitos:** OL-5.
- **Pasos:**
  1. **Acción:** Editar el documento y no escribir durante 2000 ms.
     **Resultado esperado:** Se emite exactamente 1 llamada PATCH `documents.update` y el estado pasa a "Guardado".
     **Datos de prueba:** debounce 2000 ms.

### CP-HU05-02 – Cerrar pestaña envía beacon [MANUAL 2/2]

- **Descripción:** `beforeunload` despacha `sendBeacon` con el estado pendiente. Cubre CA-05.2.
- **Precondiciones:** Editor con cambios pendientes. DevTools en Network.
- **Estado:** Borrador. **Prioridad:** Media. **Tipo de Prueba:** Funcional. **Tipo de ejecución:** Manual.
- **Carpeta:** OL-5. **Id:** (vacío).
- **Etiquetas:** HU-05, CA-05.2, manual. **Requisitos:** OL-5.
- **Pasos:**
  1. **Acción:** Editar el documento sin esperar el guardado automático.
     **Resultado esperado:** Quedan cambios pendientes de guardar.
     **Datos de prueba:** (vacío).
  2. **Acción:** Cerrar o recargar la pestaña.
     **Resultado esperado:** Se observa un `sendBeacon` con el último estado pendiente en la pestaña Network.
     **Datos de prueba:** DevTools → Network.

### CP-HU05-03 – Reintento con backoff al recuperar red

- **Descripción:** Tras offline→online reintenta 1 s/3 s/9 s, máx. 3 intentos. Cubre CA-05.3.
- **Precondiciones:** Fallo de red simulado en el guardado.
- **Estado:** Borrador. **Prioridad:** Alta. **Tipo de Prueba:** Integración. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-5. **Id:** `documents.update.spec.ts::"backoff 1s/3s/9s"`.
- **Etiquetas:** HU-05, CA-05.3, integracion, auto. **Requisitos:** OL-5.
- **Pasos:**
  1. **Acción:** Provocar un fallo de guardado y luego disparar el evento `online`.
     **Resultado esperado:** El sistema hace 3 reintentos con delays de 1 s/3 s/9 s y guarda sin intervención del usuario.
     **Datos de prueba:** red simulada caída y restaurada.

### CP-HU05-04 – Merge CRDT sin pérdida

- **Descripción:** Dos editores offline en el mismo párrafo conservan ambos aportes (Y.js). Cubre CA-05.4.
- **Precondiciones:** Dos clientes offline sobre el mismo documento.
- **Estado:** Borrador. **Prioridad:** Alta. **Tipo de Prueba:** Integración. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-5. **Id:** `collaboration.spec.ts::"merge CRDT"`.
- **Etiquetas:** HU-05, CA-05.4, auto. **Requisitos:** OL-5.
- **Pasos:**
  1. **Acción:** Editar el mismo párrafo en ambos clientes offline.
     **Resultado esperado:** Cada cliente conserva sus cambios locales.
     **Datos de prueba:** 2 clientes, mismo documento y párrafo.
  2. **Acción:** Reconectar ambos clientes y sincronizar.
     **Resultado esperado:** Ambos textos están presentes, 0 pérdida de datos.
     **Datos de prueba:** (vacío).

### CP-HU05-05 – Sin cambios no dispara guardado

- **Descripción:** Sin diff no hay PATCH. Clase de equivalencia válida.
- **Precondiciones:** Documento abierto sin modificar.
- **Estado:** Borrador. **Prioridad:** Baja. **Tipo de Prueba:** Funcional. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-5. **Id:** `documents.update.spec.ts::"sin cambios no guarda"`.
- **Etiquetas:** HU-05, valida, auto. **Requisitos:** OL-5.
- **Pasos:**
  1. **Acción:** No escribir durante 5 s.
     **Resultado esperado:** Se registran 0 llamadas PATCH.
     **Datos de prueba:** (vacío).

### CP-HU05-06 – Agota 3 intentos y avisa sin bloquear

- **Descripción:** Tras 3 fallos muestra error y permite seguir editando.
- **Precondiciones:** Red caída persistente.
- **Estado:** Borrador. **Prioridad:** Media. **Tipo de Prueba:** Funcional. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-5. **Id:** `documents.update.spec.ts::"agota reintentos"`.
- **Etiquetas:** HU-05, invalida, auto. **Requisitos:** OL-5.
- **Pasos:**
  1. **Acción:** Forzar 3 fallos de guardado consecutivos.
     **Resultado esperado:** Aparece el indicador de error y el editor sigue habilitado.
     **Datos de prueba:** red caída persistente.

### CP-HU05-07 – Edición concurrente en párrafos distintos

- **Descripción:** Dos editores online en posiciones distintas ven ambos cambios.
- **Precondiciones:** Dos editores online en el mismo documento.
- **Estado:** Borrador. **Prioridad:** Media. **Tipo de Prueba:** Integración. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-5. **Id:** `collaboration.spec.ts::"concurrente distinto parrafo"`.
- **Etiquetas:** HU-05, auto. **Requisitos:** OL-5.
- **Pasos:**
  1. **Acción:** Escribir simultáneamente en párrafos distintos del mismo documento.
     **Resultado esperado:** Ambos cambios son visibles en <1 s.
     **Datos de prueba:** 2 editores, párrafos distintos.

---

## HU-06 — Resolver y editar comentarios (OL-6 · 7 casos, todos auto)

### CP-HU06-01 – Autor edita su comentario

- **Descripción:** `comments.update` actualiza contenido y timestamp. Cubre CA-06.1.
- **Precondiciones:** Comentario existente. Autor autenticado.
- **Estado:** Borrador. **Prioridad:** Alta. **Tipo de Prueba:** Funcional. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-6. **Id:** `comments.update.spec.ts::"autor edita"`.
- **Etiquetas:** HU-06, CA-06.1, auto. **Requisitos:** OL-6.
- **Pasos:**
  1. **Acción:** Enviar POST `comments.update` con el nuevo texto.
     **Resultado esperado:** Responde 200 con el contenido actualizado y `updatedAt` registrado.
     **Datos de prueba:** `commentId` existente, texto nuevo.

### CP-HU06-02 – No-autor intenta editar

- **Descripción:** X edita comentario de Y → 403 `authorization_error`. Cubre CA-06.4.
- **Precondiciones:** Usuario X autenticado, no autor. Comentario de Y.
- **Estado:** Borrador. **Prioridad:** Alta. **Tipo de Prueba:** Seguridad. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-6. **Id:** `comments.update.spec.ts::"no-autor 403"`.
- **Etiquetas:** HU-06, CA-06.4, seguridad, auto. **Requisitos:** OL-6.
- **Pasos:**
  1. **Acción:** Enviar POST `comments.update` sobre un comentario ajeno.
     **Resultado esperado:** Responde 403 con `id: authorization_error` y el texto queda intacto.
     **Datos de prueba:** usuario X no autor, comentario de Y.

### CP-HU06-03 – Autor elimina (soft delete)

- **Descripción:** `comments.delete` oculta del listado. Cubre CA-06.2.
- **Precondiciones:** Autor autenticado. Comentario activo.
- **Estado:** Borrador. **Prioridad:** Alta. **Tipo de Prueba:** Funcional. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-6. **Id:** `comments.delete.spec.ts::"soft delete"`.
- **Etiquetas:** HU-06, CA-06.2, auto. **Requisitos:** OL-6.
- **Pasos:**
  1. **Acción:** Enviar POST `comments.delete`.
     **Resultado esperado:** Responde 200 con `deletedAt` poblado y el comentario no aparece en `comments.list`.
     **Datos de prueba:** `commentId` propio y activo.

### CP-HU06-04 – Resolver comentario

- **Descripción:** `comments.resolve` setea `resolvedAt` y pasa a Resuelto. Cubre CA-06.3.
- **Precondiciones:** Comentario activo. Editor con permiso.
- **Estado:** Borrador. **Prioridad:** Alta. **Tipo de Prueba:** Funcional. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-6. **Id:** `comments.resolve.spec.ts::"resuelve"`.
- **Etiquetas:** HU-06, CA-06.3, auto. **Requisitos:** OL-6.
- **Pasos:**
  1. **Acción:** Enviar POST `comments.resolve`.
     **Resultado esperado:** Responde 200 con `resolvedAt` poblado y estado Resuelto.
     **Datos de prueba:** `commentId` activo.

### CP-HU06-05 – No-autor intenta eliminar

- **Descripción:** X borra comentario de Y → 403 y sigue visible.
- **Precondiciones:** Usuario X no autor.
- **Estado:** Borrador. **Prioridad:** Alta. **Tipo de Prueba:** Seguridad. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-6. **Id:** `comments.delete.spec.ts::"no-autor 403"`.
- **Etiquetas:** HU-06, seguridad, auto. **Requisitos:** OL-6.
- **Pasos:**
  1. **Acción:** Enviar POST `comments.delete` sobre un comentario ajeno.
     **Resultado esperado:** Responde 403 y el comentario sigue en el listado.
     **Datos de prueba:** usuario X no autor, comentario de Y.

### CP-HU06-06 – Editar con texto vacío

- **Descripción:** Contenido vacío → 400, original intacto. Caso inválido.
- **Precondiciones:** Autor autenticado.
- **Estado:** Borrador. **Prioridad:** Media. **Tipo de Prueba:** Funcional. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-6. **Id:** `comments.update.spec.ts::"texto vacio 400"`.
- **Etiquetas:** HU-06, invalida, auto. **Requisitos:** OL-6.
- **Pasos:**
  1. **Acción:** Enviar POST `comments.update` con texto `""`.
     **Resultado esperado:** Responde 400 y el texto original queda intacto.
     **Datos de prueba:** texto vacío `""`.

### CP-HU06-07 – Reabrir comentario resuelto

- **Descripción:** `comments.unresolve` limpia `resolvedAt` y vuelve a activo.
- **Precondiciones:** Comentario en estado Resuelto.
- **Estado:** Borrador. **Prioridad:** Media. **Tipo de Prueba:** Funcional. **Tipo de ejecución:** Automatizada.
- **Carpeta:** OL-6. **Id:** `comments.unresolve.spec.ts::"reabre"`.
- **Etiquetas:** HU-06, auto. **Requisitos:** OL-6.
- **Pasos:**
  1. **Acción:** Enviar POST `comments.unresolve`.
     **Resultado esperado:** Responde 200 con `resolvedAt=null` y estado activo.
     **Datos de prueba:** `commentId` en Resuelto.

---

## Verificación rápida

- Total: 20 (6 + 7 + 7). Auto: 18. Manual: 2 (CP-HU04-06, CP-HU05-02).
- Válidos + inválidos: sí (vacío, sin collectionId, 401/403, 400).
- Trazabilidad: cada caso tiene HU + CA en etiquetas y código OL vinculado (OL-4/OL-5/OL-6).
- Técnicas 6.1: equivalencia (roles, vacío/ausente), límite (2 s, 2,5 s, 3 intentos), decisión (autor/no-autor × acción → 200/403/400).
