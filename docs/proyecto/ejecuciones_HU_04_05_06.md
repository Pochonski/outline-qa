# Entrega y ejecución de pruebas — Joseph Fonseca

## Alcance y resultados entregados

La entrega reúne el proyecto Outline y las pruebas de HU-04 Crear documento, HU-05 Autoguardado y HU-06 Resolver y editar comentarios. La base es el commit `0e19c7d89ae2f4924af98d022675bd1e9275a239` del repositorio oficial de Outline.

El plan del equipo comprende sesenta casos, distribuidos entre Joseph Fonseca, Rachel Monterrey y Yendri Obando. Esta guía describe la ejecución de los veinte casos de Joseph. La distribución completa del equipo y los CSV de los sesenta casos se incluyen en el plan. [Consultar el alcance del equipo](planes_HU_04_05_06.md).

| Ciclo | Modalidad | Aprobados | Fallidos | Total |
|---|---|---|---|---|
| C1 | 18 casos con Vitest y 2 manuales | 17 | 3 | 20 |
| C2 | 20 casos con Playwright | 13 | 7 | 20 |

Los reportes entregados conservan las ejecuciones históricas. El cierre registra siete defectos abiertos de severidad media y cumplimiento parcial de los criterios del plan. Las copias de consulta de C2 contienen 48 adjuntos distribuidos entre los veinte casos. Los campos de estado inicial de los documentos de planificación pertenecen a C1.

El informe explica los cambios de profundidad entre ciclos, las limitaciones y los pendientes. [Consultar el informe final](informe_final.pdf). El índice HTML permite consultar cada resultado y sus adjuntos una vez descargados los archivos. [Abrir el índice de evidencias](index.html).

## Preparar el entorno

Se requiere Node.js 22, Corepack, PostgreSQL 18 con permiso para crear bases de datos y Docker con Docker Compose. Los comandos se ejecutan desde la raíz del repositorio.

```sh
corepack yarn install --immutable
```

Copiar `.env.playwright.example` como `.env.playwright.local`. Completar allí `QA_DATABASE_URL` con una conexión local de PostgreSQL. La conexión también puede tomarse de `DATABASE_URL` en `.env.development`. El nombre de la base de pruebas se fija a `outline_playwright` a partir de esa conexión.

La configuración se carga desde `.env.development` y `.env.playwright.local`. La plantilla admite `QATLAS_TOKEN`, que también puede proporcionarse como variable de entorno del proceso. [Consultar la plantilla de variables](../../.env.playwright.example).

```sh
corepack yarn qa:prepare
```

La preparación crea la base `outline_playwright`, inicia Redis en `127.0.0.1:6380`, compila el servidor, aplica las migraciones, crea cinco usuarios ficticios e instala Chromium. Los secretos temporales, los actores y los archivos generados se guardan en `.qa/`. La aplicación de pruebas utiliza `http://localhost:3100` y Vite el puerto 3001.

## Ejecutar y publicar resultados

Para ejecutar los veinte casos y generar resultados locales se utiliza el siguiente comando.

```sh
corepack yarn qa:playwright
```

Cada ronda genera `.qa/runs/<id>/results.xml`, un manifiesto y adjuntos. El reporte HTML de Playwright se guarda en `playwright-report/`. Los casos que detectan las diferencias documentadas pueden terminar fallidos.

Para publicar una nueva ronda, definir `QATLAS_TOKEN` con un token de la cuenta de Joseph Fonseca y autorización para el proyecto OL. El reporter comprueba el identificador de usuario 11 y consulta sus casos en el proyecto 7. Ejecutar el comando de ingesta una vez configurado ese token.

```sh
corepack yarn qa:playwright:qatlas
```

La API utilizada es `https://geotorotur.tail052473.ts.net/qatlas/api`. La conexión requiere acceso de red a esa instancia. El reporter relaciona las pruebas con QAtlas mediante la anotación `qatlas` y su código `OL-TC`.

Para reanudar una publicación pendiente de la última ronda generada localmente se utiliza el manifiesto registrado en `.qa/latest-run.txt`.

```sh
corepack yarn qa:qatlas:retry
```

Para comprobar el descubrimiento de las pruebas se puede consultar la lista de Playwright.

```sh
corepack yarn exec playwright test --list --reporter=list
```

## Archivos del código

| Archivo | Función |
|---|---|
| [playwright.config.ts](../../playwright.config.ts) | Configuración de navegador, reportes y descubrimiento de pruebas. |
| [tsconfig.playwright.json](../../tsconfig.playwright.json) | Configuración de TypeScript para las pruebas. |
| [documents.create.playwright.spec.ts](../../server/routes/api/documents/documents.create.playwright.spec.ts) | Cinco casos de creación de documentos. |
| [Document.playwright.spec.ts](../../app/scenes/Document/components/Document.playwright.spec.ts) | Ocho casos de indicadores, guardado y colaboración. |
| [comments.playwright.spec.ts](../../server/routes/api/comments/comments.playwright.spec.ts) | Siete casos de comentarios. |
| [playwright-fixtures.ts](tools/playwright-fixtures.ts) | Usuarios, sesiones, solicitudes y registro de evidencias. |
| [qatlas-reporter.ts](tools/qatlas-reporter.ts) | Manifiesto local, ingesta y reanudación de resultados. |
| [playwright-run.mjs](tools/playwright-run.mjs) | Preparación, arranque de servicios y ejecución. |
| [playwright-environment.mjs](tools/playwright-environment.mjs) | Carga de variables, compilación y base de pruebas. |
| [playwright-vite.mjs](tools/playwright-vite.mjs) | Servidor de desarrollo del cliente. |
| [playwright-services.yml](tools/playwright-services.yml) | Servicio Redis de las pruebas. |
| [seedPlaywright.ts](../../server/scripts/seedPlaywright.ts) | Workspace de pruebas y cinco usuarios ficticios. |

Los archivos `*.qa.test.ts` conservan las pruebas de Vitest de C1. La exportación de `AUTOSAVE_DELAY` en `useDocumentSave.ts` permite comprobar el intervalo existente desde la prueba de C1. Su valor es 3000 ms.

## Trazabilidad de los veinte casos en C2

| Caso QAtlas | Caso académico | Archivo Playwright | Resultado |
|---|---|---|---|
| OL-TC-1 | CP-HU04-01 | documents.create.playwright.spec.ts | Fallido |
| OL-TC-2 | CP-HU04-02 | documents.create.playwright.spec.ts | Fallido |
| OL-TC-3 | CP-HU04-03 | documents.create.playwright.spec.ts | Aprobado |
| OL-TC-4 | CP-HU04-04 | documents.create.playwright.spec.ts | Aprobado |
| OL-TC-5 | CP-HU04-05 | documents.create.playwright.spec.ts | Aprobado |
| OL-TC-6 | CP-HU04-06 | Document.playwright.spec.ts | Fallido |
| OL-TC-10 | CP-HU05-01 | Document.playwright.spec.ts | Fallido |
| OL-TC-11 | CP-HU05-02 | Document.playwright.spec.ts | Fallido |
| OL-TC-13 | CP-HU05-03 | Document.playwright.spec.ts | Fallido |
| OL-TC-14 | CP-HU05-04 | Document.playwright.spec.ts | Aprobado |
| OL-TC-15 | CP-HU05-05 | Document.playwright.spec.ts | Aprobado |
| OL-TC-16 | CP-HU05-06 | Document.playwright.spec.ts | Fallido |
| OL-TC-17 | CP-HU05-07 | Document.playwright.spec.ts | Aprobado |
| OL-TC-18 | CP-HU06-01 | comments.playwright.spec.ts | Aprobado |
| OL-TC-19 | CP-HU06-02 | comments.playwright.spec.ts | Aprobado |
| OL-TC-21 | CP-HU06-03 | comments.playwright.spec.ts | Aprobado |
| OL-TC-22 | CP-HU06-04 | comments.playwright.spec.ts | Aprobado |
| OL-TC-39 | CP-HU06-05 | comments.playwright.spec.ts | Aprobado |
| OL-TC-40 | CP-HU06-06 | comments.playwright.spec.ts | Aprobado |
| OL-TC-41 | CP-HU06-07 | comments.playwright.spec.ts | Aprobado |

Los cinco grupos de C2 corresponden a las siguientes corridas del manifiesto entregado.

| Corrida | Grupo | Casos |
|---|---|---|
| OL-RUN-16 | HU-04 Creación | OL-TC-1 a OL-TC-5 |
| OL-RUN-17 | HU-04 Indicador, de origen manual | OL-TC-6 |
| OL-RUN-18 | HU-05 Autoguardado | OL-TC-10, 13, 14, 15, 16 y 17 |
| OL-RUN-19 | HU-05 Beacon, de origen manual | OL-TC-11 |
| OL-RUN-20 | HU-06 Comentarios | OL-TC-18, 19, 21, 22, 39, 40 y 41 |

Las reconstrucciones OL-RUN-27 a OL-RUN-29 conservan los resultados automatizados de C1. OL-RUN-14 y OL-RUN-15 conservan los dos resultados manuales originales. La comparación histórica considera las fechas de los respaldos y las corridas explícitas de C2. El campo de última corrida de un caso puede apuntar a la reconstrucción registrada posteriormente.

## Reportes y evidencias

- [Reportes de C1](reportes/ciclo_1) contiene los tres JUnit originales y el resumen de los veinte casos.
- [Reportes de C2](reportes/ciclo_2) contiene el JUnit, el manifiesto con rutas relativas y los 48 adjuntos.
- [Inventario de reportes](reportes/inventario.json) identifica los archivos y sus hashes SHA-256.
- [Informe final](informe_final.pdf) documenta los resultados, los siete defectos, las métricas, la reflexión y la lista de chequeo.

Las copias de consulta de las evidencias ocultan las credenciales de los registros y de las trazas. Los siete contextos de error se entregan en TXT. El manifiesto entregado corresponde al archivo histórico de consulta. Para publicar o reanudar una ronda se utiliza el manifiesto generado en `.qa/runs/` por la ejecución local.

Los CSV de requisitos, casos y ejecuciones conservan las exportaciones iniciales de octubre. El archivo `Plan_de_Pruebas_Outline_.docx` corresponde a la planificación del equipo. Los resultados de C2 se consultan en `reportes/ciclo_2/` y en el informe final.

## Seguimiento del cierre

- Actualizar los identificadores de automatización de QAtlas para referenciar las especificaciones actuales de Playwright y conservar la referencia de C1.
- Comparar la cantidad de documentos antes y después de las solicitudes de OL-TC-2 a OL-TC-5.
- Completar los identificadores de error en OL-TC-4, OL-TC-5 y OL-TC-39.
- Verificar visualmente en el navegador la categoría «Resuelto» de CA-06.3.

La aprobación funcional de C2 es de 6/12 y la de integración de 2/3. Los cinco casos de seguridad aprobaron las aserciones ejecutadas, con las comprobaciones adicionales de esta lista pendientes.

## Documentos Markdown de la entrega

Los cinco documentos del proyecto permiten revisar la definición inicial y relacionarla con la ejecución entregada.

- [Requisitos](requisitos_OL_04_05_06.md).
- [Casos de prueba](casos_OL_04_05_06.md).
- [Plan del equipo](planes_HU_04_05_06.md).
- [Suites](suites_HU_04_05_06.md).
- Este documento de ejecución y trazabilidad.

## Preparación original de las ejecuciones de C1

**Propietario:** Joseph Andres Fonseca Nuñez (Test Manager)
**QAtlas:** Ejecuciones → Nuevo. Cada ejecución se crea desde su suite.
**Suites base:** ver `suites_HU_04_05_06.md`.
**Orden recomendado:** auto primero (1–3), manuales al final (4–5).

---

## Ejecución 1 — HU-04 auto

- **Nombre de la ejecución:** `Ejecución HU-04 auto — Crear documento (ronda 1)`
- **Desde una suite:** buscar `Suite HU-04 auto — Crear documento`
- **Casos incluidos (5):** OL-TC-1, OL-TC-2, OL-TC-3, OL-TC-4, OL-TC-5

## Ejecución 2 — HU-06 auto

- **Nombre de la ejecución:** `Ejecución HU-06 auto — Comentarios (ronda 1)`
- **Desde una suite:** buscar `Suite HU-06 auto — Comentarios`
- **Casos incluidos (7):** OL-TC-18, OL-TC-21, OL-TC-22, OL-TC-41, OL-TC-19, OL-TC-39, OL-TC-40

## Ejecución 3 — HU-05 auto

- **Nombre de la ejecución:** `Ejecución HU-05 auto — Auto-save (ronda 1)`
- **Desde una suite:** buscar `Suite HU-05 auto — Auto-save`
- **Casos incluidos (6):** OL-TC-10, OL-TC-15, OL-TC-13, OL-TC-16, OL-TC-14, OL-TC-17

## Ejecución 4 — HU-04 manual

- **Nombre de la ejecución:** `Ejecución HU-04 manual — Indicador de guardado (ronda 1)`
- **Desde una suite:** buscar `Suite HU-04 manual — Indicador de guardado`
- **Casos incluidos (1):** OL-TC-6 (con evidencia de tiempos)

## Ejecución 5 — HU-05 manual

- **Nombre de la ejecución:** `Ejecución HU-05 manual — Beacon al cerrar (ronda 1)`
- **Desde una suite:** buscar `Suite HU-05 manual — Beacon al cerrar`
- **Casos incluidos (1):** OL-TC-11 (con evidencia de Network)

---

## Verificación

- Conteos jalados por suite: 5, 7, 6, 1, 1 = 20 totales.
- Al crear cada ejecución, confirmar el conteo antes de guardar.
