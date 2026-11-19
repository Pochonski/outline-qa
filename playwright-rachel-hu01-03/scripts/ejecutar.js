'use strict';

/**
 * Ejecuta las pruebas de una historia de usuario y envía el resultado a QAtlas
 * como una ejecución nueva, con nombre y número de corrida propios.
 *
 * Uso: node scripts/ejecutar.js hu01 | hu02 | hu03 | todo
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const HISTORIAS = {
  hu01: ['HU-01 Publicar y compartir documento', 'tests/hu01.spec.ts'],
  hu02: ['HU-02 Administrar miembros del equipo', 'tests/hu02.spec.ts'],
  hu03: ['HU-03 Notificaciones y suscripción', 'tests/hu03.spec.ts'],
  todo: ['HU-01 a HU-03', 'tests'],
};

const clave = (process.argv[2] || 'todo').toLowerCase();
const historia = HISTORIAS[clave];
if (!historia) {
  console.error(`Historia desconocida "${clave}". Usa: ${Object.keys(HISTORIAS).join(', ')}`);
  process.exit(2);
}

const ahora = new Date();
const id = `rachel-${clave}-${ahora.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`;
const fecha = ahora.toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' });

const env = {
  ...process.env,
  QATLAS_RUN_ID: process.env.QATLAS_RUN_ID || id,
  QATLAS_RUN_NAME: process.env.QATLAS_RUN_NAME || `Playwright ${historia[0]} — ${fecha} [${id.slice(-8)}]`,
};

const cli = path.join(require.resolve('@playwright/test/package.json'), '..', 'cli.js');
const resultado = spawnSync(process.execPath, [cli, 'test', historia[1]], { stdio: 'inherit', env });
process.exit(resultado.status ?? 1);
