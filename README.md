# Entrega académica de QA — Joseph Fonseca

Este repositorio reúne el proyecto Outline y las pruebas de HU-04 Crear documento, HU-05 Autoguardado y HU-06 Resolver y editar comentarios. La entrega conserva el código de Vitest de C1 y los veinte casos de Playwright de C2, con su reporter de ingesta para QAtlas.

El plan del equipo abarca sesenta casos, veinte por integrante. Rachel Monterrey cubre HU-01 a HU-03, Joseph Fonseca HU-04 a HU-06 y Yendri Obando HU-07 a HU-09. Los CSV incluidos reúnen los sesenta casos y los nueve requisitos del equipo. [Consultar el plan y su distribución](docs/proyecto/planes_HU_04_05_06.md).

La base del proyecto es Outline en el commit `0e19c7d89ae2f4924af98d022675bd1e9275a239`.

| Revisión | Archivo |
|---|---|
| Preparación, ejecución, ingesta y trazabilidad | [Guía de pruebas](docs/proyecto/ejecuciones_HU_04_05_06.md) |
| Informe final de 67 páginas | [Informe de pruebas](docs/proyecto/informe_final.pdf) |
| Veinte resultados de C2 y 48 adjuntos | [Índice HTML descargable](docs/proyecto/index.html) |
| Reportes JUnit y manifiestos históricos | [Reportes](docs/proyecto/reportes/) |
| Archivos y hashes SHA-256 de los reportes | [Inventario](docs/proyecto/reportes/inventario.json) |

C1 registra 17 aprobados y 3 fallidos. C2 registra 13 aprobados y 7 fallidos. El informe documenta los siete defectos abiertos, el cumplimiento parcial del plan y los pendientes de seguimiento. Los reportes corresponden a las ejecuciones históricas conservadas.

La preparación requiere Node.js 22, PostgreSQL 18 y Docker con Docker Compose. Los comandos se ejecutan desde la raíz del repositorio, después de completar la conexión local indicada en la guía.

```sh
corepack yarn install --immutable
corepack yarn qa:prepare
corepack yarn qa:playwright
```

Para publicar una nueva ronda en QAtlas se proporciona `QATLAS_TOKEN` por variable de entorno o mediante `.env.playwright.local` y se ejecuta `corepack yarn qa:playwright:qatlas`. La plantilla está en [.env.playwright.example](.env.playwright.example). Las copias de consulta de las evidencias ocultan las credenciales de los registros y de las trazas.

Los documentos del proyecto describen los [requisitos](docs/proyecto/requisitos_OL_04_05_06.md), los [casos](docs/proyecto/casos_OL_04_05_06.md), el [plan](docs/proyecto/planes_HU_04_05_06.md), las [suites](docs/proyecto/suites_HU_04_05_06.md) y las [ejecuciones](docs/proyecto/ejecuciones_HU_04_05_06.md). Los campos de preparación inicial se identifican como históricos de C1.

## Pruebas de Rachel Monterrey (HU-01 a HU-03)

Rachel Monterrey cubre HU-01 Publicar y compartir documento (OL-7), HU-02 Administrar miembros del equipo (OL-8) y HU-03 Configuración de notificaciones (OL-9). Sus veinte casos de prueba y sus resultados están en QAtlas, proyecto OL, y en su informe de pruebas. Las pruebas automáticas son de dos tipos: las de Vitest están junto a las rutas de la API que prueban, y las de Playwright están en la carpeta `playwright-rachel-hu01-03`. Las dos suites cubren los mismos 18 casos automatizados.

| Archivo | Historia | Casos de prueba | Casos de QAtlas |
|---|---|---|---|
| server/routes/api/shares/shares.qa-hu01.test.ts | HU-01 | CP-HU01-01 a 04 | OL-TC-7, 9, 12 y 20 |
| server/routes/api/users/users.qa-hu02.test.ts | HU-02 | CP-HU02-01 a 09 | OL-TC-23 a 31 |
| server/routes/api/notifications/notifications.qa-hu03.test.ts | HU-03 | CP-HU03-01, 02, 03 y 05 | OL-TC-32, 33, 34 y 36 |
| server/routes/api/subscriptions/subscriptions.qa-hu03.test.ts | HU-03 | CP-HU03-04 | OL-TC-35 |

Cada prueba tiene una sola verificación, lleva el código del caso en su nombre y prepara sus datos en un método previo. CP-HU01-03 y CP-HU01-04 están parametrizadas. CP-HU01-01 queda como pendiente (it.todo), porque Outline no tiene la lista de dominios permitidos que pide el requisito CA-01.1 (defecto OL-BUG-1). Los casos manuales OL-TC-37 y OL-TC-38 no tienen prueba automática.

La ejecución conjunta del 17 de noviembre de 2026 dio 17 pruebas aprobadas y 1 pendiente. No se registró en QAtlas. Requiere PostgreSQL y Redis de pruebas en ejecución, y se lanza desde la raíz del repositorio.

```sh
yarn vitest run server/routes/api/users/users.qa-hu02.test.ts server/routes/api/shares/shares.qa-hu01.test.ts server/routes/api/notifications/notifications.qa-hu03.test.ts server/routes/api/subscriptions/subscriptions.qa-hu03.test.ts
```

Las pruebas de Playwright de la carpeta `playwright-rachel-hu01-03` llaman a la API de un Outline aislado (sin navegador) y son con las que se obtuvo la ejecución del ciclo 2 (OL-RUN-21): automatizan 18 de los 20 casos, con un archivo por historia (`hu01.spec.ts`, `hu02.spec.ts` y `hu03.spec.ts`). Cada caso tiene su bloque de pruebas con una sola verificación por prueba, la preparación en `beforeEach` y la etiqueta `@OL-TC-n` que lo vincula con QAtlas. CP-HU02-05 está parametrizada por rol. CP-HU01-01 (OL-TC-7) queda bloqueada por el defecto OL-BUG-1. La ejecución del 18 de noviembre de 2026 dio 66 pruebas aprobadas y 1 omitida, sin enviar nada a QAtlas. Las instrucciones para levantar el Outline aislado están en el README de esa carpeta, y se ejecutan desde ella.

```sh
cd playwright-rachel-hu01-03
npm install
npx playwright test
```

## Proyecto Outline

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/logos/outline-logo-dark.png" height="29">
    <source media="(prefers-color-scheme: light)" srcset="./public/logos/outline-logo-light.png" height="29">
    <img src="./public/logos/outline-logo-light.png" height="29" alt="Outline" />
  </picture>
</p>
<p align="center">
  <i>A fast, collaborative, knowledge base for your team built using React and Node.js.<br/>Try out Outline using our hosted version at <a href="https://www.getoutline.com">www.getoutline.com</a>.</i>
  <br/>
  <img width="1640" alt="screenshot" src="https://user-images.githubusercontent.com/380914/110356468-26374600-7fef-11eb-9f6a-f2cc2c8c6590.png">
</p>
<p align="center">
  <a href="http://www.typescriptlang.org" rel="nofollow"><img src="https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg" alt="TypeScript"></a>
  <a href="https://github.com/styled-components/styled-components"><img src="https://img.shields.io/badge/style-%F0%9F%92%85%20styled--components-orange.svg" alt="Styled Components"></a>
  <a href="https://translate.getoutline.com/project/outline" alt="Localized"><img src="https://badges.crowdin.net/outline/localized.svg"></a>
</p>

This is the source code that runs [**Outline**](https://www.getoutline.com) and all the associated services. If you want to use Outline then you don't need to run this code, A hosted version of the app is offered at [getoutline.com](https://www.getoutline.com). You can also find documentation on using Outline in [our guide](https://docs.getoutline.com/s/guide).

If you'd like to run your own copy of Outline or contribute to development then this is the place for you.

# Installation

Please see the [documentation](https://docs.getoutline.com/s/hosting/) for running your own copy of Outline in a production configuration.

Available container images:
* [![Container Image Release](https://img.shields.io/docker/v/outlinewiki/outline?sort=semver&label=Latest%20release)](https://hub.docker.com/r/outlinewiki/outline)
* [![Container Image Nightly](https://img.shields.io/docker/v/outlinewiki/outline?sort=date&label=Latest%20development%20version)](https://hub.docker.com/r/outlinewiki/outline)

If you have questions or improvements for the docs please create a thread in [GitHub discussions](https://github.com/outline/outline/discussions).

# Contributing

> **Note:** Please do not submit AI-generated pull requests. We receive a high volume of mass, low-quality PRs generated by AI tools like Claude, ChatGPT, and Copilot from contributors who are unfamiliar with the codebase. These PRs are almost never mergeable and waste maintainer time reviewing them. If you’d like to contribute, please take the time to understand the codebase and write your changes thoughtfully.

Before submitting a pull request _you must_ discuss with the core team by creating or commenting in an issue on [GitHub](https://www.github.com/outline/outline/issues) – we’d also love to hear from you in the [discussions](https://www.github.com/outline/outline/discussions). This way we can ensure that an approach is agreed on before code is written and that you have read these instructions. This will result in a much higher likelihood of your code being accepted.

If you’re looking for ways to get started, here’s a list of ways to help us improve Outline:

- [Translation](docs/TRANSLATION.md) into other languages
- Issues with [`good first issue`](https://github.com/outline/outline/labels/good%20first%20issue) label
- Performance improvements, both on server and frontend
- Developer happiness and documentation
- Bugs, quality fixes, and other issues listed on GitHub

# Development

There is a short guide for [setting up a development environment](https://docs.getoutline.com/s/hosting/doc/local-development-5hEhFRXow7) if you wish to contribute changes, fixes, and improvements to Outline.

## Architecture

If you're interested in contributing or learning more about the Outline codebase
please refer to the [architecture document](docs/ARCHITECTURE.md) first for a high level overview of how the application is put together.

## Debugging

In development Outline outputs simple logging to the console, prefixed by categories. In production it outputs JSON logs, these can be easily parsed by your preferred log ingestion pipeline.

HTTP logging is disabled by default, but can be enabled by setting the `DEBUG=http` environment variable. logging
can be enabled for all categories by setting `DEBUG=*` or for specific categories such as `DEBUG=database` and `LOG_LEVEL=debug`, or `LOG_LEVEL=silly` for very verbose logging.

## Tests

We aim to have sufficient test coverage for critical parts of the application and aren't aiming for 100% unit test coverage. All API endpoints and anything authentication related should be thoroughly tested.

To add new tests, write your tests with [Vitest](https://vitest.dev/) and add a file with `.test.ts` extension next to the tested code.

```shell
# To run all tests
make test

# To run backend tests in watch mode
make watch
```

Once the test database is created with `make test` you may individually run
frontend and backend tests directly with vitest:

```shell
# To run backend tests
yarn test:server

# To run a specific backend test in watch mode
yarn test path/to/file.test.ts --watch

# To run frontend tests
yarn test:app
```

## Migrations

Sequelize is used to create and run migrations, for example:

```shell
yarn db:create-migration --name my-migration
yarn db:migrate
yarn db:rollback
```

Or, to run migrations on test database:

```shell
yarn db:migrate --env test
```

# Activity

![Alt](https://repobeats.axiom.co/api/embed/ff2e4e6918afff1acf9deb72d1ba6b071d586178.svg "Repobeats analytics image")

# License

Outline is [BSL 1.1 licensed](LICENSE).
