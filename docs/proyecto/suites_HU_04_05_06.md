# Suites — HU-04 / HU-05 / HU-06 (Outline)

Estas agrupaciones conservan los nombres y la modalidad inicial de C1. El reporter de C2 mantiene cinco grupos y automatiza también los dos casos de origen manual. Las corridas y la trazabilidad actual se describen en la guía de ejecución. [Consultar las ejecuciones de C1 y C2](ejecuciones_HU_04_05_06.md).

**Propietario:** Joseph Andres Fonseca Nuñez (Test Manager)
**QAtlas:** Suites → Nuevo. Cada suite suma los casos de su plan de pruebas.
**Plan base:** plan único de sesenta casos del equipo. [Consultar el plan](planes_HU_04_05_06.md).

---

## Suite 1 — HU-04 auto

- **Nombre de la suite:** `Suite HU-04 auto — Crear documento`
- **Descripción:** `Suite de 5 casos automatizados de creación de documentos (RBAC + validación). Se ejecuta con Vitest antes de los manuales.`
- **Sumar casos del plan:** seleccionar los casos de HU-04 del plan único.
- **Casos en este orden:** OL-TC-1, OL-TC-2, OL-TC-3, OL-TC-4, OL-TC-5

## Suite 2 — HU-04 manual

- **Nombre de la suite:** `Suite HU-04 manual — Indicador de guardado`
- **Descripción:** `Suite manual del indicador visual de guardado (CA-04.1) con cronómetro y evidencia.`
- **Sumar casos del plan:** seleccionar OL-TC-6 del plan único.
- **Casos en este orden:** OL-TC-6

## Suite 3 — HU-05 auto

- **Nombre de la suite:** `Suite HU-05 auto — Auto-save`
- **Descripción:** `Suite de 6 casos automatizados de auto-guardado: debounce, backoff, CRDT y equivalencia.`
- **Sumar casos del plan:** seleccionar los casos automatizados de HU-05 del plan único.
- **Casos en este orden:** OL-TC-10, OL-TC-15, OL-TC-13, OL-TC-16, OL-TC-14, OL-TC-17
- **Nota de orden:** primero debounce (10) y sin-cambios (15), luego reintentos (13, 16), después concurrencia/CRDT (14, 17).

## Suite 4 — HU-05 manual

- **Nombre de la suite:** `Suite HU-05 manual — Beacon al cerrar`
- **Descripción:** `Suite manual del sendBeacon al cerrar pestaña (CA-05.2) con evidencia de Network.`
- **Sumar casos del plan:** seleccionar OL-TC-11 del plan único.
- **Casos en este orden:** OL-TC-11

## Suite 5 — HU-06 auto

- **Nombre de la suite:** `Suite HU-06 auto — Comentarios`
- **Descripción:** `Suite de 7 casos automatizados de comentarios: update/delete/resolve/unresolve + seguridad no-autor.`
- **Sumar casos del plan:** seleccionar los siete casos de HU-06 del plan único.
- **Casos en este orden:** OL-TC-18, OL-TC-21, OL-TC-22, OL-TC-41, OL-TC-19, OL-TC-39, OL-TC-40
- **Nota de orden:** ciclo de vida del comentario primero (editar → eliminar → resolver → reabrir), seguridad e inválidos al final.

---

## Verificación

- Suites 1–5 jalan 5, 1, 6, 1, 7 casos = 20 totales.
- Crear en orden 1→5 y confirmar el conteo que jala cada plan.
