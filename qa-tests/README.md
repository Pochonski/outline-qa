# Pruebas automatizadas de QA

## Historias de usuario

- HU-07: interfaz y visualización en dispositivos móviles.
- HU-08: temas, preferencias y persistencia.
- HU-09: movimiento de documentos y validaciones.

## Archivos

Las pruebas de Playwright originales están en qa-tests/.

Estos 16 archivos requieren el servidor local `https://local.outline.dev:3000`, documentos preparados y el archivo privado `qa-tests/.auth/wiki.json`. No forman parte de la suite de Playwright configurada en la raíz. No se deben contar como pruebas ejecutadas por CI.

También se incluyen pruebas unitarias y de integración en app/, shared/ y server/.

## Ejecución

La prueba OL-TC-43 fue adaptada y ejecutada correctamente en el entorno del equipo.

Comandos utilizados:
- corepack yarn qa:prepare
- corepack yarn qa:playwright app/scenes/Document/components/hu07-tabla.playwright.spec.ts --reporter=list

Las demás pruebas originales requieren validación o adaptación para ejecutarse con la configuración del equipo.

## Estado

- OL-TC-43: aprobada en el entorno del equipo.
- Demás pruebas: pendientes de validación en el entorno del equipo.
