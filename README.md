# Entrega de QA de Joseph Fonseca

Proyecto académico de aseguramiento de la calidad de Outline. El alcance de Joseph cubre HU-04 Crear documento, HU-05 Autoguardado y HU-06 Resolver y editar comentarios, con veinte casos automatizados en Playwright durante C2.

La guía de preparación, ejecución e ingesta en QAtlas incluye las rutas del código y las limitaciones documentadas. [Consultar la guía de pruebas](docs/proyecto/ejecuciones_HU_04_05_06.md).

El cierre registra C1 con 17 aprobados y 3 fallidos, y C2 con 13 aprobados, 7 fallidos y 7 defectos abiertos. El informe y las copias de consulta de las 48 evidencias acompañan la entrega. [Abrir el informe final](docs/proyecto/informe_final.pdf). [Consultar los resultados y evidencias de C2](docs/proyecto/index.html).

La base del proyecto es Outline en el commit `0e19c7d89ae2f4924af98d022675bd1e9275a239`. La documentación original de Outline continúa a continuación.

---

# Entrega académica de QA — Joseph Fonseca

Este repositorio reúne el proyecto Outline y las pruebas de HU-04 Crear documento, HU-05 Autoguardado y HU-06 Resolver y editar comentarios. La entrega conserva el código de Vitest de C1 y los veinte casos de Playwright de C2, con su reporter de ingesta para QAtlas.

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
