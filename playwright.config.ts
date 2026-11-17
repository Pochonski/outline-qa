import path from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["app/**/*.playwright.spec.ts", "server/**/*.playwright.spec.ts"],
  testIgnore: ["**/node_modules/**", "**/build/**", "**/.qa/**"],
  tsconfig: "tsconfig.playwright.json",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 5000 },
  outputDir: path.join(process.env.QA_RUN_DIR || ".qa/latest", "artifacts"),
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    [
      "junit",
      {
        outputFile: path.join(
          process.env.QA_RUN_DIR || ".qa/latest",
          "results.xml"
        ),
      },
    ],
    ["./docs/proyecto/tools/qatlas-reporter.ts"],
  ],
  use: {
    baseURL: "http://localhost:3100",
    locale: "es-ES",
    viewport: { width: 1440, height: 1000 },
    browserName: "chromium",
    headless: true,
  },
});
