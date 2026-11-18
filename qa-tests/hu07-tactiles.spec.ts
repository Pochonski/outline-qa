
import { test, expect } from "@playwright/test";
import fs from "node:fs";

const URL_DOCUMENTO =
  "https://local.outline.dev:3000/doc/qa-hu-07-prueba-de-tabla-movil-2TvCokbah0";

test.use({
  viewport: { width: 390, height: 844 },
  ignoreHTTPSErrors: true,
  storageState: "qa-tests/.auth/wiki.json",
});

test(
  "OL-TC-45 - Tamaño mínimo de elementos táctiles",
  async ({ page }) => {
    // PASO 1: Abrir Outline en una pantalla móvil.
    await page.goto(URL_DOCUMENTO, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByText("QA HU-07 - Prueba de tabla móvil").first()
    ).toBeVisible({ timeout: 20000 });

    const viewport = page.viewportSize();

    console.log("PASO 1 - VIEWPORT:", viewport);
    console.log("DOCUMENTO: Cargado correctamente.");

    expect(viewport?.width).toBe(390);
    expect(viewport?.height).toBe(844);

    // PASOS 2 Y 3:
    // Identificar controles visibles y medir sus dimensiones.
    const elementos = await page.evaluate(() => {
      const selectores = [
        "button",
        "a[href]",
        "input",
        "select",
        "textarea",
        '[role="button"]',
      ].join(", ");

      return Array.from(document.querySelectorAll<HTMLElement>(selectores))
        .filter((elemento) => {
          const estilos = window.getComputedStyle(elemento);
          const rect = elemento.getBoundingClientRect();

          return (
            estilos.display !== "none" &&
            estilos.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0 &&
            rect.right > 0 &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.top < window.innerHeight
          );
        })
        .map((elemento, indice) => {
          const rect = elemento.getBoundingClientRect();

          return {
            numero: indice + 1,
            tipo: elemento.tagName.toLowerCase(),
            nombre:
              elemento.getAttribute("aria-label") ||
              elemento.getAttribute("title") ||
              elemento.textContent?.trim().slice(0, 45) ||
              "(sin nombre)",
            ancho: Math.round(rect.width * 100) / 100,
            alto: Math.round(rect.height * 100) / 100,
          };
        });
    });

    console.log("PASO 2 - CONTROLES IDENTIFICADOS:", elementos.length);

    expect(elementos.length).toBeGreaterThan(0);

    // Umbral de referencia: 24 x 24 píxeles CSS (WCAG 2.2 AA).
    // Un elemento pequeño puede cumplir mediante espaciado
    // suficiente u otras excepciones; se reporta para revisión.
    const UMBRAL = 24;

    const pequenos = elementos.filter(
      (elemento) =>
        elemento.ancho < UMBRAL || elemento.alto < UMBRAL
    );

    console.log("PASO 3 - RESULTADOS:");
    console.table(elementos);

    console.log(
      "CONTROLES MENORES DE 24 x 24 px:",
      pequenos.length
    );

    if (pequenos.length > 0) {
      console.log("CONTROLES PARA REVISAR:");
      console.table(pequenos);
    }

    // Guardar resultados completos como evidencia.
    fs.mkdirSync("qa-tests/evidencias", { recursive: true });

    fs.writeFileSync(
      "qa-tests/evidencias/OL-TC-45_Mediciones.json",
      JSON.stringify(
        {
          viewport,
          umbralReferencia: UMBRAL,
          totalControles: elementos.length,
          controlesMenores: pequenos.length,
          elementos,
        },
        null,
        2
      )
    );

    await page.screenshot({
      path: "qa-tests/evidencias/OL-TC-45_Playwright.png",
      fullPage: true,
    });

    console.log("EVIDENCIAS: Guardadas correctamente.");
    console.log("OL-TC-45: Inspección completada.");
  }
);
