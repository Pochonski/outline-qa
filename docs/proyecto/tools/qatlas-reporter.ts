/* oxlint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type {
  FullConfig,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { z } from "zod";

interface Group {
  key: string;
  title: string;
  codes: string[];
}

interface Evidence {
  name: string;
  type: string;
  path: string;
  step: number;
}

interface StepResult {
  title: string;
  status: string;
  error_message?: string;
}

interface CaseResult {
  test_case_code: string;
  status: string;
  error_message?: string;
  duration_ms: number;
  attempts: number;
  flaky: boolean;
  steps: StepResult[];
  evidence: Evidence[];
}

interface PublishedGroup {
  id: number;
  code: string;
  completed: boolean;
}

interface Round {
  version: number;
  id: string;
  createdAt: string;
  results: CaseResult[];
  groups: Record<string, PublishedGroup>;
}

const groups: Group[] = [
  {
    key: "hu04-create",
    title: "HU-04 Crear documento",
    codes: ["OL-TC-1", "OL-TC-2", "OL-TC-3", "OL-TC-4", "OL-TC-5"],
  },
  {
    key: "hu04-indicator",
    title: "HU-04 Indicador de guardado (origen manual)",
    codes: ["OL-TC-6"],
  },
  {
    key: "hu05-autosave",
    title: "HU-05 Auto-save",
    codes: [
      "OL-TC-10",
      "OL-TC-13",
      "OL-TC-14",
      "OL-TC-15",
      "OL-TC-16",
      "OL-TC-17",
    ],
  },
  {
    key: "hu05-beacon",
    title: "HU-05 Beacon al cerrar (origen manual)",
    codes: ["OL-TC-11"],
  },
  {
    key: "hu06-comments",
    title: "HU-06 Comentarios",
    codes: [
      "OL-TC-18",
      "OL-TC-19",
      "OL-TC-21",
      "OL-TC-22",
      "OL-TC-39",
      "OL-TC-40",
      "OL-TC-41",
    ],
  },
];
const stepCounts: Record<string, number> = {
  "OL-TC-1": 2,
  "OL-TC-6": 2,
  "OL-TC-11": 2,
  "OL-TC-14": 2,
};
const roundSchema = z.object({
  version: z.number(),
  id: z.string(),
  createdAt: z.string(),
  results: z.array(
    z.object({
      test_case_code: z.string(),
      status: z.string(),
      error_message: z.string().optional(),
      duration_ms: z.number(),
      attempts: z.number(),
      flaky: z.boolean(),
      steps: z.array(
        z.object({
          title: z.string(),
          status: z.string(),
          error_message: z.string().optional(),
        })
      ),
      evidence: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
          path: z.string(),
          step: z.number(),
        })
      ),
    })
  ),
  groups: z.record(
    z.string(),
    z.object({ id: z.number(), code: z.string(), completed: z.boolean() })
  ),
});
const ingestSchema = z.object({
  test_run: z.object({ id: z.number(), code: z.string() }),
  rows: z.array(
    z.object({
      key: z.string(),
      matched: z.boolean(),
      test_case_code: z.string().nullable(),
      test_run_case_id: z.number().nullable(),
    })
  ),
  summary: z.object({ matched: z.number(), unmatched: z.number() }),
});
const attachmentSchema = z.array(z.object({ filename: z.string() }));

function redact(message: string): string {
  return message
    .replace(/qat_pat_[\w-]+/g, "[REDACTED]")
    .replace(/Bearer\s+[\w.-]+/gi, "Bearer [REDACTED]")
    .slice(0, 4000);
}

async function saveRound(filename: string, round: Round): Promise<void> {
  const temporary = `${filename}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(round, null, 2));
  await fs.rename(temporary, filename);
}

async function api(route: string, init: RequestInit = {}): Promise<Response> {
  const token = process.env.QATLAS_TOKEN;
  if (!token) {
    throw new Error("Falta QATLAS_TOKEN.");
  }
  const baseUrl =
    process.env.QATLAS_URL || "https://geotorotur.tail052473.ts.net/qatlas/api";
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${route}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(
      `QAtlas ${response.status} ${route} ${redact(await response.text())}`
    );
  }
  return response;
}

async function uploadEvidence(
  result: CaseResult,
  caseId: number
): Promise<void> {
  for (const evidence of result.evidence) {
    const body = await fs.readFile(evidence.path);
    const digest = createHash("sha256").update(body).digest("hex").slice(0, 12);
    const name = `${digest}-${evidence.name}`;
    const existing = attachmentSchema.parse(
      await (
        await api(
          `/attachments?entity_type=test_run_case&entity_id=${caseId}&step_order=${evidence.step}`
        )
      ).json()
    );
    if (existing.some((attachment) => attachment.filename === name)) {
      continue;
    }
    const limit = evidence.type.startsWith("video/")
      ? 50 * 1024 * 1024
      : 10 * 1024 * 1024;
    if (body.length > limit) {
      throw new Error(
        `La evidencia ${evidence.name} supera el límite de QAtlas.`
      );
    }
    const form = new FormData();
    form.append("entity_type", "test_run_case");
    form.append("entity_id", String(caseId));
    form.append("step_order", String(evidence.step));
    form.append("file", new Blob([body], { type: evidence.type }), name);
    await api("/attachments", { method: "POST", body: form });
  }
}

async function linkOpenDefects(
  runId: number,
  results: CaseResult[]
): Promise<void> {
  const failures = results.filter((result) => result.status === "failed");
  if (failures.length === 0) {
    return;
  }
  const run = z
    .object({
      cases: z.array(
        z.object({
          id: z.number(),
          test_case_code: z.string(),
          bugs: z.array(z.object({ id: z.number(), status: z.string() })),
        })
      ),
    })
    .parse(await (await api(`/test-runs/${runId}`)).json());
  const isOpen = (status: string) =>
    !["cerrado", "resuelto", "rechazado", "duplicado"].includes(status);
  for (const failure of failures) {
    const current = run.cases.find(
      (item) => item.test_case_code === failure.test_case_code
    );
    if (!current) {
      throw new Error(
        `Falta ${failure.test_case_code} en la ejecución ${runId}.`
      );
    }
    if (current.bugs.some((bug) => isOpen(bug.status))) {
      continue;
    }
    // Ingest may reuse an open defect without linking it to the new run case.
    let page = 1;
    let remaining = true;
    let bugId: number | undefined;
    while (remaining && !bugId) {
      const bugs = z
        .object({
          data: z.array(
            z.object({
              id: z.number(),
              status: z.string(),
              source_test_case_code: z.string().nullable(),
            })
          ),
          meta: z.object({ total: z.number() }),
        })
        .parse(
          await (
            await api(`/bugs?project_id=7&page[size]=100&page[number]=${page}`)
          ).json()
        );
      bugId = bugs.data.find(
        (bug) =>
          bug.source_test_case_code === failure.test_case_code &&
          isOpen(bug.status)
      )?.id;
      remaining = page * 100 < bugs.meta.total;
      page++;
    }
    if (!bugId) {
      throw new Error(
        `Falta un defecto abierto para ${failure.test_case_code}.`
      );
    }
    await api(`/test-runs/${runId}/cases/${current.id}/bugs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bug_id: bugId }),
    });
  }
}

/** Publishes the five groups and resumes incomplete uploads from a saved manifest.
 * @param filename the manifest path for a completed local round.
 *
 * @returns a promise that resolves when all five runs are completed.
 * @throws when cases do not match or QAtlas cannot save results or evidence.
 */
export async function publishRound(filename: string): Promise<void> {
  const round = roundSchema.parse(
    JSON.parse(await fs.readFile(filename, "utf8"))
  );
  const expectedCodes = groups.flatMap((group) => group.codes);
  const actualCodes = round.results.map((result) => result.test_case_code);
  if (
    actualCodes.length !== 20 ||
    new Set(actualCodes).size !== 20 ||
    expectedCodes.some((code) => !actualCodes.includes(code))
  ) {
    throw new Error(
      "La publicación requiere exactamente los 20 casos de Joseph."
    );
  }
  const identity = z
    .object({ id: z.number() })
    .parse(await (await api("/auth/me")).json());
  if (identity.id !== 11) {
    throw new Error(
      "La integración está configurada para la cuenta de Joseph en el proyecto OL."
    );
  }
  const cases = z
    .object({
      data: z.array(
        z.object({
          id: z.number(),
          code: z.string(),
          owner_id: z.number().nullable(),
          execution_type: z.string(),
          automation_id: z.string().nullable(),
          steps: z.array(z.object({ order: z.number() })),
          tags: z.array(z.string()),
        })
      ),
    })
    .parse(
      await (
        await api("/test-cases?project_id=7&owner_id=11&page[size]=100")
      ).json()
    ).data;
  for (const result of round.results) {
    const current = cases.find((item) => item.code === result.test_case_code);
    if (
      !current ||
      current.owner_id !== 11 ||
      current.steps.length !== result.steps.length
    ) {
      throw new Error(
        `La definición actual de ${result.test_case_code} no coincide con los pasos de Playwright.`
      );
    }
  }
  for (const code of ["OL-TC-6", "OL-TC-11"]) {
    const current = cases.find((item) => item.code === code);
    if (
      current &&
      (current.execution_type !== "automatizado" ||
        current.automation_id !== code ||
        !current.tags.includes("playwright"))
    ) {
      await api(`/test-cases/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          execution_type: "automatizado",
          automation_id: code,
          tags: [
            ...new Set([
              ...current.tags.filter((tag) => tag !== "manual"),
              "auto",
              "playwright",
            ]),
          ],
        }),
      });
    }
  }
  for (const group of groups) {
    const results = group.codes
      .map((code) => round.results.find((item) => item.test_case_code === code))
      .filter((item): item is CaseResult => !!item);
    const existing = round.groups[group.key];
    let caseIds: Map<string, number>;
    if (existing) {
      const run = z
        .object({
          status: z.string(),
          cases: z.array(
            z.object({ id: z.number(), test_case_code: z.string() })
          ),
        })
        .parse(await (await api(`/test-runs/${existing.id}`)).json());
      if (run.status === "completado") {
        await linkOpenDefects(existing.id, results);
        existing.completed = true;
        await saveRound(filename, round);
        continue;
      }
      caseIds = new Map(
        run.cases.map((item) => [item.test_case_code, item.id])
      );
    } else {
      const payload = {
        project: "OL",
        run: {
          name: `Playwright ${group.title} — ${new Intl.DateTimeFormat("es-CR", { timeZone: "America/Costa_Rica", dateStyle: "short", timeStyle: "short" }).format(new Date(round.createdAt))} [${round.id.slice(0, 8)}]`,
          external_id: `joseph-playwright-${round.id}-${group.key}`,
          environment: "local QA aislado",
          browser: "Chromium",
          build: round.id,
        },
        results: results.map(({ evidence: _evidence, ...result }) => result),
        create_missing_cases: false,
        create_bug_on_failure: true,
      };
      const response = ingestSchema.parse(
        await (
          await api("/test-runs/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        ).json()
      );
      if (
        response.summary.unmatched !== 0 ||
        response.summary.matched !== group.codes.length
      ) {
        throw new Error(`QAtlas no vinculó todos los casos de ${group.title}.`);
      }
      round.groups[group.key] = {
        id: response.test_run.id,
        code: response.test_run.code,
        completed: false,
      };
      await saveRound(filename, round);
      caseIds = new Map();
      for (const row of response.rows) {
        if (
          row.matched &&
          row.test_case_code &&
          row.test_run_case_id !== null
        ) {
          caseIds.set(row.test_case_code, row.test_run_case_id);
        }
      }
    }
    for (const result of results) {
      const caseId = caseIds.get(result.test_case_code);
      if (!caseId) {
        throw new Error(`Falta el caso ejecutado ${result.test_case_code}.`);
      }
      await uploadEvidence(result, caseId);
    }
    const published = round.groups[group.key];
    await linkOpenDefects(published.id, results);
    await api(`/test-runs/${published.id}/complete`, { method: "POST" });
    published.completed = true;
    await saveRound(filename, round);
    console.log(
      `[QAtlas] https://geotorotur.tail052473.ts.net/qatlas/test-runs/${published.code}`
    );
  }
}

/** Records Playwright outcomes and evidence, then optionally publishes a full QA round. */
export default class QAtlasReporter implements Reporter {
  /** Creates the local directory before the first result is received.
   * @param _config the Playwright configuration.
   *
   * @returns a promise resolving after the directory is ready.
   */
  public async onBegin(_config: FullConfig): Promise<void> {
    await fs.mkdir(this.directory, { recursive: true });
  }

  /** Saves one test's final outcome with aligned QAtlas steps.
   * @param test the completed test definition.
   *
   * @param result the latest attempt's result.
   * @returns a promise resolving after evidence is saved locally.
   */
  public async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    const code = test.annotations.find(
      (annotation) => annotation.type === "qatlas"
    )?.description;
    if (!code || !groups.some((group) => group.codes.includes(code))) {
      throw new Error(`Falta un código QAtlas válido en ${test.title}.`);
    }
    const status =
      result.status === "passed"
        ? "passed"
        : result.status === "skipped"
          ? "skipped"
          : "failed";
    const count = stepCounts[code] || 1;
    const recordedSteps = result.steps.filter(
      (step) => step.category === "test.step"
    );
    const steps: StepResult[] = Array.from({ length: count }, (_, index) => {
      const step = recordedSteps[index];
      return {
        title: step?.title || `Paso ${index + 1}`,
        status: step ? (step.error ? "failed" : "passed") : "skipped",
        error_message: step?.error?.message
          ? redact(step.error.message)
          : undefined,
      };
    });
    if (
      status === "failed" &&
      !steps.some((step) => step.status === "failed")
    ) {
      steps[count - 1].status = "failed";
      steps[count - 1].error_message = redact(
        result.error?.message || "Falló la preparación o finalización del caso."
      );
    }
    const failedStep = steps.findIndex((step) => step.status === "failed");
    const evidence: Evidence[] = [];
    for (const [index, attachment] of result.attachments.entries()) {
      let filename = attachment.path;
      if (!filename && attachment.body) {
        filename = path.join(
          this.directory,
          `${code}-${index}-${attachment.name}`
        );
        await fs.writeFile(filename, attachment.body);
      }
      if (filename) {
        evidence.push({
          name: path.basename(filename),
          type: attachment.contentType,
          path: path.resolve(filename),
          step: failedStep < 0 ? count : failedStep + 1,
        });
      }
    }
    this.results.set(code, {
      test_case_code: code,
      status,
      error_message: result.error?.message
        ? redact(result.error.message)
        : undefined,
      duration_ms: Math.round(result.duration),
      attempts: result.retry + 1,
      flaky: result.retry > 0 && status === "passed",
      steps,
      evidence,
    });
  }

  /** Persists the manifest and publishes configured QAtlas groups.
   * @returns the reporter status if publishing fails.
   */
  public async onEnd(): Promise<{ status: "failed" } | void> {
    const filename = path.join(this.directory, "manifest.json");
    const round: Round = {
      version: 1,
      id: process.env.QA_ROUND_ID || path.basename(this.directory),
      createdAt: new Date().toISOString(),
      results: [...this.results.values()],
      groups: {},
    };
    await saveRound(filename, round);
    if (round.results.length === 20) {
      await fs.writeFile(path.resolve(".qa/latest-run.txt"), filename);
    }
    console.log(`[QA] Manifiesto ${filename}`);
    if (process.env.QA_PUBLISH === "1") {
      try {
        await publishRound(filename);
      } catch (error) {
        console.error(
          `[QAtlas] ${error instanceof Error ? error.message : "Error de publicación"}`
        );
        console.error("Recuperá el envío con corepack yarn qa:qatlas:retry.");
        return { status: "failed" };
      }
    }
  }

  private results = new Map<string, CaseResult>();
  private directory = process.env.QA_RUN_DIR || path.resolve(".qa/latest");
}

if (process.argv[1]?.endsWith("qatlas-reporter.ts") && process.argv[2]) {
  publishRound(process.argv[2]).catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
