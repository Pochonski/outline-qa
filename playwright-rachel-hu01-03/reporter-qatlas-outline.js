'use strict';

/**
 * Extensión del reporter oficial de QAtlas (qatlas-reporter.js, sin modificar).
 *
 * Agrega lo que la documentación de QAtlas indica que el reporter oficial no hace:
 *  1. Sube la evidencia indicando el paso (step_order); sin ese dato, QAtlas
 *     guarda el adjunto pero no lo muestra en la pantalla de la ejecución.
 *  2. Informa como "bloqueado" los casos cuya prueba se marcó con la anotación
 *     qatlas-estado = bloqueado (el reporter oficial solo conoce aprobado,
 *     fallido y omitido).
 *  3. Completa la ejecución al terminar (POST /test-runs/{id}/complete).
 *
 * Si QAtlas no responde o falta configuración, avisa y no rompe la corrida.
 */

const fs = require('node:fs');
const path = require('node:path');
const QAtlasReporter = require('./qatlas-reporter.js');

const MAX_ATTACHMENTS_PER_CASE = 10;
const truthy = (value) => ['1', 'true', 'yes', 'si'].includes(String(value ?? '').toLowerCase());

class QAtlasOutlineReporter extends QAtlasReporter {
  constructor(options = {}) {
    super(options);
    this.completeRun = options.completeRun ?? truthy(process.env.QATLAS_COMPLETE_RUN);
    this.lastRun = undefined;
  }

  /** El reporter oficial llama a qualityGate(run) al final de una ingesta exitosa: aquí se guarda la ejecución. */
  async qualityGate(run) {
    this.lastRun = run;
    return super.qualityGate(run);
  }

  async onEnd() {
    const result = await super.onEnd();
    if (!this.lastRun) return result; // la ingesta no ocurrió (configuración incompleta o error)

    await this.reportBlocked();
    await this.complete();
    return result;
  }

  /** Casos que el reporter oficial envió como "omitido" pero que en realidad están bloqueados. */
  async reportBlocked() {
    const results = [];
    for (const { test } of this.tests.values()) {
      const annotations = test.annotations || [];
      const state = annotations.find((a) => a.type === 'qatlas-estado')?.description;
      const code = annotations.find((a) => a.type === 'qatlas')?.description;
      if (state !== 'bloqueado' || !code) continue;
      results.push({
        test_case_code: code,
        title: test.title,
        status: 'blocked',
        error_message: annotations.find((a) => a.type === 'qatlas-motivo')?.description,
      });
    }
    if (results.length === 0) return;

    try {
      const response = await fetch(`${this.url}/test-runs/ingest`, {
        method: 'POST',
        headers: this.headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          project: this.project,
          run: { name: this.runName, external_id: this.externalId },
          results,
        }),
      });
      if (!response.ok) {
        return this.fail(`no se pudo marcar como bloqueado (${response.status}): ${(await response.text()).slice(0, 300)}`);
      }
      this.log(`${results.length} caso(s) marcado(s) como bloqueado: ${results.map((r) => r.test_case_code).join(', ')}`);
    } catch (error) {
      this.fail(`no se pudo marcar como bloqueado (${error.message})`);
    }
  }

  async complete() {
    if (!this.completeRun) return;
    try {
      const response = await fetch(`${this.url}/test-runs/${this.lastRun.id}/complete`, {
        method: 'POST',
        headers: this.headers(),
      });
      if (!response.ok) {
        return this.warn(`no se pudo completar la ejecución (${response.status}): ${(await response.text()).slice(0, 300)}`);
      }
      this.log(`ejecución ${this.lastRun.code} completada.`);
    } catch (error) {
      this.warn(`no se pudo completar la ejecución (${error.message})`);
    }
  }

  /** Igual que el oficial, pero cada adjunto se sube con el número del paso. */
  async uploadEvidence(entries, payloadResults, rows) {
    const rowByKey = new Map(rows.map((row) => [row.key, row]));
    for (let index = 0; index < entries.length; index += 1) {
      const { result } = entries[index];
      const sent = payloadResults[index];
      const row = rowByKey.get(sent.test_case_code || sent.automation_id);
      if (!row?.matched || !row.test_run_case_id) continue;
      if (this.attachments === 'failed' && sent.status !== 'failed') continue;
      // La evidencia va en el último paso del caso (en los que fallan, en el paso que falló).
      const steps = sent.steps || [];
      const failedAt = steps.findIndex((s) => s.status === 'failed');
      const stepOrder = failedAt >= 0 ? failedAt + 1 : Math.max(steps.length, 1);
      const files = (result.attachments || []).filter((a) => a.path || a.body);
      for (const attachment of files.slice(0, MAX_ATTACHMENTS_PER_CASE)) {
        await this.uploadOne(row, attachment, stepOrder);
      }
    }
  }

  async uploadOne(row, attachment, stepOrder) {
    const type = String(attachment.contentType || '').split(';')[0];
    let name = attachment.path ? path.basename(attachment.path) : attachment.name;
    if (!path.extname(name) && type === 'application/json') name += '.json';
    try {
      const body = attachment.body ?? fs.readFileSync(attachment.path);
      if (body.length > 10 * 1024 * 1024) return this.warn(`adjunto "${name}" omitido: supera 10 MB.`);
      const form = new FormData();
      form.append('entity_type', 'test_run_case');
      form.append('entity_id', String(row.test_run_case_id));
      if (stepOrder) form.append('step_order', String(stepOrder));
      form.append('file', new Blob([body], { type }), name);
      const response = await fetch(`${this.url}/attachments`, {
        method: 'POST',
        headers: this.headers(),
        body: form,
      });
      if (!response.ok) this.warn(`no se pudo subir "${name}" (${response.status}).`);
    } catch (error) {
      this.warn(`no se pudo subir "${name}" (${error.message}).`);
    }
  }
}

module.exports = QAtlasOutlineReporter;
module.exports.default = QAtlasOutlineReporter;
