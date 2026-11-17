import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "@dotenvx/dotenvx";
import pg from "pg";

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);
export const qaRoot = path.join(root, ".qa");

/**
 * Returns the supported Node executable, including a locally cached Node 22.
 *
 * @returns the supported Node executable path.
 * @throws when Node 22 is unavailable.
 */
export function nodeExecutable() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major === 22) {
    return process.execPath;
  }
  const cache = path.join(
    process.env.LOCALAPPDATA || "",
    "outline-playwright-runtime"
  );
  const directory = fs.existsSync(cache)
    ? fs.readdirSync(cache).find((name) => /^node-v22\..*-win-x64$/.test(name))
    : undefined;
  if (directory) {
    return path.join(cache, directory, "node.exe");
  }
  throw new Error(
    "Usá Node 22 para ejecutar los comandos qa de este proyecto."
  );
}

/**
 * Executes a process with the QA environment and rejects unsuccessful exits.
 *
 * @param command the executable to start.
 * @param args the command arguments.
 * @param env the child process environment.
 * @param options additional child process options.
 * @returns a promise resolving after a successful exit.
 * @throws when the child process fails.
 */
export function execute(command, args, env = process.env, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      windowsHide: true,
      stdio: "inherit",
      ...options,
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(`${path.basename(command)} terminó con código ${code}.`)
      );
    });
  });
}

/**
 * Loads secrets and connection settings for the isolated local QA environment.
 *
 * @returns the environment for QA processes.
 */
export function environment() {
  fs.mkdirSync(qaRoot, { recursive: true });
  const base = dotenv.parse(
    fs.readFileSync(path.join(root, ".env.development"), "utf8")
  );
  const localFile = path.join(root, ".env.playwright.local");
  const local = fs.existsSync(localFile)
    ? dotenv.parse(fs.readFileSync(localFile, "utf8"))
    : {};
  const secretFile = path.join(qaRoot, "secrets.json");
  const secrets = fs.existsSync(secretFile)
    ? JSON.parse(fs.readFileSync(secretFile, "utf8"))
    : {
        SECRET_KEY: randomBytes(32).toString("hex"),
        UTILS_SECRET: randomBytes(32).toString("hex"),
      };
  fs.writeFileSync(secretFile, JSON.stringify(secrets), { mode: 0o600 });
  const database = new URL(local.QA_DATABASE_URL || base.DATABASE_URL);
  database.pathname = "/outline_playwright";
  const env = {
    ...process.env,
    ...base,
    ...local,
    ...secrets,
    NODE_ENV: "development",
    URL: "http://localhost:3100",
    PORT: "3100",
    DATABASE_URL: database.toString(),
    REDIS_URL: "redis://127.0.0.1:6380",
    FORCE_HTTPS: "false",
    WEB_CONCURRENCY: "1",
    FILE_STORAGE: "local",
    FILE_STORAGE_LOCAL_ROOT_DIR: path.join(qaRoot, "uploads"),
    DEVELOPMENT_UNSAFE_INLINE_CSP: "true",
    TELEMETRY: "false",
    LOG_LEVEL: "warn",
    QA_ROOT: qaRoot,
    QATLAS_URL: "https://geotorotur.tail052473.ts.net/qatlas/api",
    QATLAS_PROJECT: "OL",
  };
  env.QATLAS_TOKEN = process.env.QATLAS_TOKEN || local.QATLAS_TOKEN || "";
  env.PATH = path.dirname(nodeExecutable()) + path.delimiter + process.env.PATH;
  return env;
}

/**
 * Compiles the existing server and copies its runtime assets using native Node APIs.
 *
 * @param env the QA environment.
 * @returns a promise resolving after compilation and asset copying.
 */
export async function compileServer(env) {
  const compiler = path.join(root, "node_modules/@swc/cli/bin/swc.js");
  for (const source of ["server", "shared", "plugins"]) {
    await execute(
      nodeExecutable(),
      [
        compiler,
        source,
        "-d",
        `build/${source}`,
        "--strip-leading-paths",
        "--extensions",
        ".ts,.tsx",
        "--ignore",
        "**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/__mocks__/**",
        "--quiet",
      ],
      env
    );
  }
  fs.copyFileSync(
    path.join(root, "package.json"),
    path.join(root, "build/package.json")
  );
  fs.cpSync(
    path.join(root, "shared/i18n/locales"),
    path.join(root, "build/shared/i18n/locales"),
    { recursive: true }
  );
  for (const name of ["error.dev.html", "error.prod.html"]) {
    fs.copyFileSync(
      path.join(root, "server/static", name),
      path.join(root, "build/server", name)
    );
  }
  for (const plugin of fs.readdirSync(path.join(root, "plugins"))) {
    const manifest = path.join(root, "plugins", plugin, "plugin.json");
    if (fs.existsSync(manifest)) {
      fs.mkdirSync(path.join(root, "build/plugins", plugin), {
        recursive: true,
      });
      fs.copyFileSync(
        manifest,
        path.join(root, "build/plugins", plugin, "plugin.json")
      );
    }
  }
}

/**
 * Creates the dedicated database, starts Redis, migrates and seeds the QA workspace.
 *
 * @param env the QA environment.
 * @returns a promise resolving when the QA environment is ready.
 */
export async function prepare(env) {
  const adminUrl = new URL(env.DATABASE_URL);
  adminUrl.pathname = "/postgres";
  const client = new pg.Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const existing = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      ["outline_playwright"]
    );
    if (existing.rowCount === 0) {
      await client.query('CREATE DATABASE "outline_playwright"');
    }
  } finally {
    await client.end();
  }
  await execute(
    "docker",
    [
      "compose",
      "-f",
      "docs/proyecto/tools/playwright-services.yml",
      "up",
      "-d",
    ],
    env
  );
  await compileServer(env);
  // The database starts empty. Test mode skips legacy data backfills whose
  // shell commands cannot handle Windows workspace paths containing spaces.
  await execute(
    nodeExecutable(),
    [
      "node_modules/sequelize-cli/lib/sequelize",
      "db:migrate",
      "--env",
      "development",
    ],
    { ...env, NODE_ENV: "test" }
  );
  await execute(
    nodeExecutable(),
    ["build/server/scripts/seedPlaywright.js"],
    env
  );
  await execute(
    nodeExecutable(),
    ["node_modules/playwright/cli.js", "install", "chromium"],
    env
  );
  console.log(
    "QA preparado. Ejecutá corepack yarn qa:playwright o qa:playwright:qatlas."
  );
}
