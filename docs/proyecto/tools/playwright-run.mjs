import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  environment,
  execute,
  nodeExecutable,
  prepare,
  qaRoot,
  root,
} from "./playwright-environment.mjs";

const mode = process.argv[2] || "test";
const env = environment();

async function waitFor(url, child) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`El servicio de ${url} terminó durante el arranque.`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        return;
      }
    } catch {
      // The service is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No se pudo iniciar ${url}. Revisá .qa/services.log.`);
}

async function main() {
  if (mode === "prepare") {
    await prepare(env);
    return;
  }
  if (mode === "retry") {
    const manifest =
      process.argv[3] ||
      fs.readFileSync(path.join(qaRoot, "latest-run.txt"), "utf8").trim();
    await execute(
      nodeExecutable(),
      [
        "--experimental-strip-types",
        "docs/proyecto/tools/qatlas-reporter.ts",
        manifest,
      ],
      env
    );
    return;
  }
  if (!fs.existsSync(path.join(qaRoot, "actors.json"))) {
    throw new Error("Primero ejecutá corepack yarn qa:prepare.");
  }
  if (mode === "report" && !env.QATLAS_TOKEN) {
    throw new Error("Definí QATLAS_TOKEN para enviar resultados a QAtlas.");
  }
  await execute(
    nodeExecutable(),
    ["build/server/scripts/seedPlaywright.js"],
    env
  );
  env.QA_ROUND_ID = randomUUID();
  env.QA_PUBLISH = mode === "report" ? "1" : "0";
  env.QA_RUN_DIR = path.join(qaRoot, "runs", env.QA_ROUND_ID);
  fs.mkdirSync(env.QA_RUN_DIR, { recursive: true });
  const log = fs.openSync(path.join(qaRoot, "services.log"), "a");
  const services = [
    spawn(
      nodeExecutable(),
      [
        "--require",
        "./build/server/scripts/bootstrap.js",
        "build/server/index.js",
        "--services=web,collaboration,websockets,worker",
      ],
      { cwd: root, env, windowsHide: true, stdio: ["ignore", log, log] }
    ),
    spawn(nodeExecutable(), ["docs/proyecto/tools/playwright-vite.mjs"], {
      cwd: root,
      env,
      windowsHide: true,
      stdio: ["ignore", log, log],
    }),
  ];
  try {
    await Promise.all([
      waitFor(`${env.URL}/_health`, services[0]),
      waitFor("http://localhost:3001/static/@vite/client", services[1]),
    ]);
    const { request } = await import("@playwright/test");
    const actors = JSON.parse(
      fs.readFileSync(path.join(qaRoot, "actors.json"), "utf8")
    );
    const preflight = await request.newContext({
      baseURL: env.URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${actors.actors.editor.token}`,
      },
    });
    try {
      const response = await preflight.post("/api/auth.info");
      const auth = await response.json();
      if (!response.ok() || auth.data?.team?.id !== actors.teamId) {
        throw new Error(
          "El servidor no corresponde al workspace aislado de Playwright."
        );
      }
    } finally {
      await preflight.dispose();
    }
    await execute(
      nodeExecutable(),
      ["node_modules/playwright/cli.js", "test", ...process.argv.slice(3)],
      env
    );
  } finally {
    for (const service of services) {
      if (service.pid && service.exitCode === null) {
        if (process.platform === "win32") {
          await execute(
            "taskkill",
            ["/PID", String(service.pid), "/T", "/F"],
            process.env,
            { stdio: "ignore" }
          ).catch(() => undefined);
        } else {
          service.kill("SIGTERM");
        }
      }
    }
    fs.closeSync(log);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
