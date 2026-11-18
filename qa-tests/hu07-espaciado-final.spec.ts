
import { test, expect } from "@playwright/test";
import fs from "node:fs";

const URL =
  "https://local.outline.dev:3000/doc/qa-hu-07-prueba-de-tabla-movil-2TvCokbah0";

test.use({
  viewport: { width: 390, height: 844 },
  ignoreHTTPSErrors: true,
  storageState: "qa-tests/.auth/wiki.json",
});

test("OL-TC-45 - Evaluación de espaciado táctil", async ({ page }) => {
  await page.goto(URL, { waitUntil: "domcontentloaded" });

  await expect(
    page.getByText("QA HU-07 - Prueba de tabla móvil").first()
  ).toBeVisible({ timeout: 20000 });

  const resultado = await page.evaluate(() => {
    const selector =
      'button, a[href], input, select, textarea, [role="button"]';

    const controles = Array.from(
      document.querySelectorAll<HTMLElement>(selector)
    )
      .filter((elemento) => {
        const estilo = getComputedStyle(elemento);
        const r = elemento.getBoundingClientRect();

        return (
          estilo.display !== "none" &&
          estilo.visibility !== "hidden" &&
          estilo.pointerEvents !== "none" &&
          r.width > 0 &&
          r.height > 0 &&
          r.left < innerWidth &&
          r.right > 0 &&
          r.top < innerHeight &&
          r.bottom > 0
        );
      })
      .map((elemento, indice) => {
        const r = elemento.getBoundingClientRect();

        return {
          id: indice + 1,
          nombre:
            elemento.getAttribute("aria-label") ||
            elemento.textContent?.trim().slice(0, 55) ||
            "(sin nombre)",
          x: r.left,
          y: r.top,
          derecha: r.right,
          abajo: r.bottom,
          ancho: r.width,
          alto: r.height,
          centroX: r.left + r.width / 2,
          centroY: r.top + r.height / 2,
        };
      });

    const pequenos = controles.filter(
      (c) => c.ancho < 24 || c.alto < 24
    );

    const evaluaciones = pequenos.map((c) => {
      // WCAG 2.2 - separación geométrica:
      // círculo de 24 px centrado sobre el objetivo.
      const vecinos = controles
        .filter((otro) => otro.id !== c.id)
        .map((otro) => {
          const dx = Math.max(
            otro.x - c.centroX,
            0,
            c.centroX - otro.derecha
          );

          const dy = Math.max(
            otro.y - c.centroY,
            0,
            c.centroY - otro.abajo
          );

          return {
            nombre: otro.nombre,
            distanciaAlRectangulo: Math.hypot(dx, dy),
          };
        });

      const intersecciones = vecinos.filter(
        (v) => v.distanciaAlRectangulo < 12
      );

      return {
        nombre: c.nombre,
        ancho: Number(c.ancho.toFixed(2)),
        alto: Number(c.alto.toFixed(2)),
        intersecciones: intersecciones.map((v) => ({
          nombre: v.nombre,
          distancia: Number(v.distanciaAlRectangulo.toFixed(2)),
        })),
        cumpleEspaciadoEnMuestra: intersecciones.length === 0,
      };
    });

    return {
      viewport: { width: innerWidth, height: innerHeight },
      controlesAnalizados: controles.length,
      controlesPequenos: pequenos.length,
      evaluaciones,
    };
  });

  console.log("VIEWPORT:", resultado.viewport);
  console.log("CONTROLES ANALIZADOS:", resultado.controlesAnalizados);
  console.log("CONTROLES PEQUEÑOS:", resultado.controlesPequenos);

  for (const e of resultado.evaluaciones) {
    console.log("\nCONTROL:", e.nombre);
    console.log("DIMENSIONES:", e.ancho, "x", e.alto);
    console.log("INTERSECCIONES:", e.intersecciones);
    console.log(
      "RESULTADO:",
      e.cumpleEspaciadoEnMuestra
        ? "Sin intersecciones en la muestra"
        : "Posible incumplimiento: revisar"
    );
  }

  fs.mkdirSync("qa-tests/evidencias", { recursive: true });

  fs.writeFileSync(
    "qa-tests/evidencias/OL-TC-45_Evaluacion_Final.json",
    JSON.stringify(resultado, null, 2)
  );

  await page.screenshot({
    path: "qa-tests/evidencias/OL-TC-45_Evaluacion_Final.png",
    fullPage: true,
  });

  expect(resultado.controlesAnalizados).toBeGreaterThan(0);

  console.log("\nOL-TC-45: Evaluación geométrica completada.");
});
