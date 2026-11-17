# Plan de pruebas — Proyecto Outline QA (60 casos, equipo completo)

Este documento conserva la planificación inicial del equipo para C1. Las fechas sugeridas, los campos de borrador y la distribución de 18 automatizados con Vitest y 2 manuales por integrante pertenecen a esa etapa. El alcance de Joseph en C2 comprende veinte casos automatizados con Playwright. El cierre y el seguimiento se describen en la guía de ejecución y el informe final. [Consultar la entrega de Joseph](ejecuciones_HU_04_05_06.md).

Este documento conserva la planificación inicial de C1. Las fechas sugeridas, el estado Borrador y la distribución de 18 automatizados y 2 manuales por integrante pertenecen a esa etapa. El cierre de Joseph incorpora veinte casos con Playwright en C2 y declara cumplimiento parcial de los criterios de salida. [Consultar la entrega y los resultados](ejecuciones_HU_04_05_06.md).

**QAtlas:** Planes de Prueba → Nuevo (un solo plan para todo el proyecto, según indicación del profesor).
**Proyecto:** Outline — aseguramiento de calidad (Fase 2, plan de pruebas).
**Alcance total:** 9 requisitos (OL-4…OL-12) · **60 casos** (máximo 6 manuales = 10%).
**Estado inicial:** Borrador. **Fechas sugeridas:** `13/10/2026 → 07/11/2026` (ajustar a fecha oficial).

---

## Campos QAtlas (pegar directo)

- **Nombre del plan:** `Plan de pruebas — Proyecto Outline QA (60 casos)`
- **Estado:** Borrador.

### Alcance y objetivos

```
Verificar las funcionalidades críticas seleccionadas de Outline
mediante pruebas funcionales, de seguridad e integración, con el fin
de comprobar su seguridad, confiabilidad y experiencia de usuario
durante la gestión colaborativa de información (objetivo general
Fase 1, semestre II 2026).

El plan cubre los 9 requisitos del equipo (OL-4…OL-12) con 60 casos:
54 automatizados + 6 manuales con evidencia en navegador
(tope 10%; supuesto a confirmar por A y C con sus 20 c/u). Tipos de prueba: funcional caja negra API (Tipo 1),
seguridad y control de acceso (Tipo 2) y UX manual estructurado
(Tipo 3); rendimiento como criterio transversal (benchmark opcional).

Distribución por responsable (20 casos c/u: 18 auto + 2 manuales):
- Joseph Fonseca: OL-4 (HU-04 Crear documento), OL-5 (HU-05
Auto-save en editor), OL-6 (HU-06 Resolver y editar comentarios):
10 funcionales + 5 seguridad + 3 integración (auto) + 2 manuales.
- Rachel Monterrey: OL-7 (HU-01 Publicar y compartir documento),
OL-8 (HU-02 Administrar miembros del equipo), OL-9 (HU-03
Configuración granular de notificaciones): 20 casos.
- Yendri Obando: OL-10 (HU-07 Accesibilidad móvil), OL-11 (HU-08
Tema oscuro), OL-12 (HU-09 Drag & drop de documentos): 20 casos.

Fuera de alcance: cualquier funcionalidad fuera de los 9 requisitos.
```

### Criterios de entrada

```
Ambiente Outline levantado (Postgres + Redis vía Docker). Suite Vitest
ejecutable (server.post + factories). Roles editor, viewer, guest y
admin disponibles. Los 60 casos en Borrador/Revisado con trazabilidad
HU-CA-caso. Navegador + cronómetro + DevTools para los 6 manuales.
```

### Criterios de salida

```
60/60 casos ejecutados. ≥95% pass en funcionales/integración. 100% de
rechazos de seguridad con código + id correctos (401/403/400). Máximo
6 manuales, todos con evidencia. Trazabilidad HU-CA-caso completa en
los 60. Defectos registrados con evidencia. Informe de pruebas con
métricas de cobertura por tipo.
```

### Recursos y responsables

```
- Joseph Fonseca (Test Manager de su alcance): diseña y ejecuta
CP-HU04-01…06, CP-HU05-01…07, CP-HU06-01…07 (18 auto Vitest + 2
manuales). Herramientas: Vitest (specs server + app/jsdom, Y.js),
Docker (Postgres/Redis), navegador + DevTools para manuales.
- Rachel Monterrey (OL-7/8/9): CP-HU01-01…04, CP-HU02-01…09,
CP-HU03-01…07 (20 casos: 18 auto Vitest + 2 manuales).
- Yendri Obando (OL-10/11/12): CP-HU07-01…05, CP-HU08-01…05,
CP-HU09-01…10 (20 casos: 18 auto Vitest + 2 manuales).
- Gestión: QAtlas (requisitos, casos, planes, suites, ejecuciones y
defectos) + evidencias JUnit/XML y capturas.
```

### Riesgos y plan de contingencia

```
1. Asserts exactos (400/403, textos, backoff) difieren del CA →
verificar contra schemas Zod e implementación, ajustar el esperado
sin cambiar el CA.
2. Casos de colaboración/tiempo real requieren 2 clientes → fallback
manual con 2 navegadores si no se automatizan a tiempo.
3. Timers/red inestables → mocks (vi.advanceTimersByTime) en auto y
repetición ×3 con promedio en manuales.
4. Exceso de manuales sobre el tope (6) → los requisitos con alta
carga UX (móvil, tema, drag&drop) deben cubrirse vía API/jsdom,
reservando los 6 manuales a lo estrictamente visual.
```

### Casos agregados al plan (60)

**Joseph — OL-4/5/6 (20, listos):**
```
OL-TC-1, OL-TC-2, OL-TC-3, OL-TC-4, OL-TC-5, OL-TC-6,
OL-TC-10, OL-TC-11, OL-TC-13, OL-TC-14, OL-TC-15, OL-TC-16, OL-TC-17,
OL-TC-18, OL-TC-19, OL-TC-21, OL-TC-22, OL-TC-39, OL-TC-40, OL-TC-41
```

**Rachel — OL-7/8/9 (20):**
```
OL-TC-7, OL-TC-9, OL-TC-12, OL-TC-20,
OL-TC-23, OL-TC-24, OL-TC-25, OL-TC-26, OL-TC-27, OL-TC-28, OL-TC-29, OL-TC-30, OL-TC-31,
OL-TC-32, OL-TC-33, OL-TC-34, OL-TC-35, OL-TC-36, OL-TC-37, OL-TC-38
```

**Yendri — OL-10/11/12 (20):**
```
OL-TC-42, OL-TC-43, OL-TC-44, OL-TC-45, OL-TC-46,
OL-TC-47, OL-TC-48, OL-TC-49, OL-TC-50, OL-TC-51,
OL-TC-52, OL-TC-53, OL-TC-54, OL-TC-55, OL-TC-56, OL-TC-57, OL-TC-58, OL-TC-59, OL-TC-60, OL-TC-61
```

Detalle de mis 20: `casos_OL_04_05_06.md`.

---

## Distribución por suite (las suites jalan de este plan único)

| Suite | Casos que deja de este plan |
|-------|------------------------------|
| Suite HU-04 auto (Joseph) | OL-TC-1, 2, 3, 4, 5 |
| Suite HU-04 manual (Joseph) | OL-TC-6 |
| Suite HU-05 auto (Joseph) | OL-TC-10, 15, 13, 16, 14, 17 |
| Suite HU-05 manual (Joseph) | OL-TC-11 |
| Suite HU-06 auto (Joseph) | OL-TC-18, 21, 22, 41, 19, 39, 40 |
| Suites Rachel (OL-7/8/9) | OL-TC-7, 9, 12, 20, 23–38 |
| Suites Yendri (OL-10/11/12) | OL-TC-42–61 |

Pre-requisito: corregir tag `CA-O5.1` del OL-TC-10 → `CA-05.1`.
