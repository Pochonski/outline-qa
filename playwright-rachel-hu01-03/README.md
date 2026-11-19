# Pruebas automatizadas de Outline con Playwright (HU-01, HU-02 y HU-03)

Automatiza los 18 casos de prueba automatizados de Rachel Monterrey (OL-7, OL-8 y OL-9 en QAtlas) y envía los
resultados a QAtlas. Los casos CP-HU03-06 y CP-HU03-07 (OL-TC-37 y OL-TC-38) son manuales y no forman parte de este proyecto.

Las pruebas llaman a la API de Outline con el cliente HTTP de Playwright (no abren navegador). Cada prueba crea
su propio equipo, usuarios con rol (admin, member, viewer) y llaves de API directamente en la base de datos del
Outline aislado, de modo que no depende de datos previos ni de otras pruebas.

## Casos cubiertos

| Archivo | Casos de QAtlas |
|---|---|
| `tests/hu01.spec.ts` | OL-TC-7, OL-TC-9, OL-TC-12, OL-TC-20 |
| `tests/hu02.spec.ts` | OL-TC-23 a OL-TC-31 |
| `tests/hu03.spec.ts` | OL-TC-32 a OL-TC-36 |

Las pruebas de cada caso llevan la anotación `qatlas` con el código del caso (por ejemplo `OL-TC-9`) y la etiqueta `@OL-TC-9`,
que es como el reporter de QAtlas la vincula con su caso.

OL-TC-7 (CP-HU01-01, dominio no permitido) queda **bloqueado**: Outline no ofrece restricción de acceso por dominio
para visitantes en enlaces compartidos (defecto OL-BUG-1). La prueba lo comprueba, adjunta la evidencia y lo informa
como bloqueado, no como fallido.

## Estructura de las pruebas

- Un bloque `describe` por caso (por ejemplo `CP-HU02-05 asignar un rol inexistente (OL-TC-27)`).
- La preparación (equipo, usuarios, documentos) y la llamada a la API están en `test.beforeEach`, y su resultado se
  guarda en variables del bloque.
- Cada prueba tiene una sola verificación (`expect`). Los datos repetidos se parametrizan con un bucle que genera
  una prueba por valor (los 4 roles de OL-TC-27).
- Son las mismas 66 verificaciones que tenía la versión anterior de cada caso; solo se separaron en pruebas.
- Las ejecuciones ya registradas en QAtlas no cambian. No ejecutes `npm run qatlas:*` con las variables de QAtlas
  definidas: crearía una ejecución nueva con varios resultados por caso.

## Requisitos

- Node.js 22 o superior.
- Docker (para el Outline aislado) o un Outline propio compilado desde el código fuente.

## 1. Levantar el Outline aislado

Opción A, Docker: `docker compose up -d` (puertos 3010 para Outline, 5433 para Postgres y 6390 para Redis). Este
archivo no se probó con Docker en la preparación del proyecto.

Opción B, desde el código fuente (así se verificaron las pruebas): clonar `outline/outline`, instalar con Yarn 4,
`yarn build:server`, `yarn db:migrate` y arrancar con `node build/server/index.js --services=web,worker`, con
`DATABASE_URL`, `REDIS_URL`, `URL`, `PORT=3010` y `SECRET_KEY` iguales a los de `.env.example`.

La `SECRET_KEY` de Outline y `OUTLINE_SECRET_KEY` de este proyecto deben ser idénticas: de ahí salen las firmas
HMAC de las pruebas CP-HU03-02, 03 y 05.

## 2. Instalar y ejecutar

```
npm install
copy .env.example .env        (en Linux o Mac: cp .env.example .env)
npm test                      (corrida local, no envía nada a QAtlas)
```

Resultado esperado: 66 pruebas aprobadas y 1 omitida (la del dominio de OL-TC-7, que se informa como bloqueada). Las 67 pruebas salen de los 18 casos: cada caso tiene un bloque `describe` y cada verificación es una prueba.

## 3. Enviar resultados a QAtlas

El reporter oficial de QAtlas (`qatlas-reporter.js`, copia sin modificar de `/qatlas/qatlas-playwright-reporter.js`)
envía los resultados al terminar. `reporter-qatlas-outline.js` lo extiende para subir la evidencia con el número de
paso (sin él QAtlas no la muestra), informar el estado bloqueado y completar la ejecución.

Define las variables en la terminal (el token no debe guardarse en archivos):

```
set QATLAS_URL=https://geotorotur.tail052473.ts.net/qatlas/api
set QATLAS_TOKEN=qat_pat_...
set QATLAS_PROJECT=OL
npm run qatlas:hu01        (o qatlas:hu02, qatlas:hu03, qatlas:todo)
```

En PowerShell usa `$env:QATLAS_URL="..."` en lugar de `set`. Cada comando crea una ejecución nueva en QAtlas, con
nombre `Playwright HU-0x ... [id]`, sus casos, duración, pasos y la evidencia en JSON (llamadas HTTP sin credenciales).

Se recomienda un token de alcance "Solo ingesta" acotado al proyecto OL (Perfil > Tokens de API) y revocarlo al terminar.

Para ensayar sin tocar QAtlas: `npm run mock-qatlas` en una terminal y, en otra,
`QATLAS_URL=http://127.0.0.1:8099/api QATLAS_TOKEN=prueba QATLAS_PROJECT=OL npm run qatlas:hu01`.
Lo recibido queda en `tools/mock-recibido.json`.

## Comportamiento de Outline que las pruebas confirman

- Enlace compartido publicado: `shares.info` sin sesión responde 200. Revocado o sin publicar: 404 `not_found`.
- `users.invite` con un correo que ya es miembro responde 200, deja el correo en `unsent` y no crea usuario.
- `users.promote` no recibe rol: siempre promueve a Admin. Para asignar un rol se usa `users.update_role`.
- Un administrador no puede suspenderse a sí mismo, aunque haya otros administradores: responde 403
  `authorization_error`, no 400 `cannot_suspend_last_admin` como pide CA-02.4.
- `notifications.unsubscribe` con firma alterada responde 302 hacia `?notice=invalid-auth` y no cambia nada.
