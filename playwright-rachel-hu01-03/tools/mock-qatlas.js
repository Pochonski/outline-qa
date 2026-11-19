'use strict';

/**
 * QAtlas de práctica: un servidor mínimo que imita POST /test-runs/ingest,
 * /attachments y /test-runs/{id}/complete, para probar el reporter sin enviar
 * nada a tu QAtlas real. Guarda lo recibido en tools/mock-recibido.json.
 *
 *   npm run mock-qatlas
 *   QATLAS_URL=http://127.0.0.1:8099/api QATLAS_TOKEN=prueba QATLAS_PROJECT=OL npm run qatlas:hu01
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PUERTO = Number(process.env.PUERTO || 8099);
const recibido = { ingestas: [], adjuntos: [], completadas: [] };
const casos = new Map(); // code -> { id, status }
let nextCase = 1000;

const guardar = () => fs.writeFileSync(path.join(__dirname, 'mock-recibido.json'), JSON.stringify(recibido, null, 2));

const servidor = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const json = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  if (!String(req.headers.authorization || '').startsWith('Bearer ')) return json(401, { detail: 'sin credencial' });

  if (req.method === 'POST' && req.url === '/api/test-runs/ingest') {
    const data = JSON.parse(body.toString());
    recibido.ingestas.push(data);
    const rows = data.results.map((r) => {
      const key = r.test_case_code || r.automation_id;
      const previo = casos.get(key) || { id: nextCase++ };
      casos.set(key, { id: previo.id, status: r.status });
      return { key, matched: true, created_case: false, status: r.status, test_case_code: key, test_run_case_id: previo.id, bug_code: null, bug_reused: false, message: null };
    });
    const resumen = { total: rows.length, matched: rows.length, unmatched: 0, created_cases: 0, created_bugs: 0, passed: 0, failed: 0, blocked: 0, skipped: 0 };
    for (const r of rows) {
      const k = { passed: 'passed', failed: 'failed', blocked: 'blocked', skipped: 'skipped' }[r.status] || 'passed';
      resumen[k] += 1;
    }
    guardar();
    return json(200, { created_run: recibido.ingestas.length === 1, test_run: { id: 31, code: 'OL-RUN-PRACTICA', status: 'en_progreso', cases: [] }, rows, summary: resumen });
  }
  if (req.method === 'POST' && req.url === '/api/attachments') {
    const texto = body.toString('latin1');
    recibido.adjuntos.push({
      entity_id: /name="entity_id"\r\n\r\n(\d+)/.exec(texto)?.[1],
      step_order: /name="step_order"\r\n\r\n(\d+)/.exec(texto)?.[1] ?? null,
      archivo: /filename="([^"]+)"/.exec(texto)?.[1],
      bytes: body.length,
    });
    guardar();
    return json(201, { id: recibido.adjuntos.length });
  }
  const completar = /^\/api\/test-runs\/(\d+)\/complete$/.exec(req.url);
  if (req.method === 'POST' && completar) {
    recibido.completadas.push(Number(completar[1]));
    guardar();
    return json(200, { id: Number(completar[1]), status: 'completado' });
  }
  json(404, { detail: 'no implementado en el QAtlas de práctica' });
});

servidor.listen(PUERTO, '127.0.0.1', () => console.log(`QAtlas de práctica en http://127.0.0.1:${PUERTO}/api`));
