import { defineConfig } from "@playwright/test";
import "dotenv/config";

/**
 * El reporter de QAtlas solo envía resultados si están definidas QATLAS_URL,
 * QATLAS_TOKEN y QATLAS_PROJECT. Sin ellas, la corrida es local y no toca QAtlas.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [
    ["list"],
    [
      "./reporter-qatlas-outline.js",
      {
        project: process.env.QATLAS_PROJECT ?? "OL",
        attachments: "all",
        completeRun: process.env.QATLAS_COMPLETE_RUN !== "0",
        environment: "Outline aislado (Postgres 16 + Redis, API)",
        browser: "API (sin navegador)",
      },
    ],
  ],
  use: { baseURL: process.env.OUTLINE_URL ?? "http://localhost:3010" },
});
