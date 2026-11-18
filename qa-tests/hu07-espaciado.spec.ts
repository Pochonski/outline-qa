
import { test, expect } from "@playwright/test";
import fs from "node:fs";

const URL =
  "https://local.outline.dev:3000/doc/qa-hu-07-prueba-de-tabla-movil-2TvCokbah0";

test.use({
  viewport: { width: 390, height: 844 },
  ignoreHTTPSErrors: true,
  storageState: "qa-tests/.auth/wiki.json",
});

test(
  "OL-TC-45 - Revisar espaciado de controles pequeños",
  async ({ page }) => {
    await page.goto(URL, {
      waitUntil: "domcontentloaded",
    });

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
          const rect = elemento.getBoundingClientRect();

          return (
            estilo.display !== "none" &&
            estilo.visibility !== "hidden" &&
            estilo.pointerEvents !== "none" &&
            rect.width > 0 &&
            rect.height > 0 &&
            rect.right > 0 &&
            rect.bottom > 0 &&
            rect.left < innerWidth &&
            rect.top < innerHeight
          );
        })
        .map((elemento, indice) => {
          const rect = elemento.getBoundingClientRect();

          return {
            id: indice + 1,
            nombre:
              elemento.getAttribute("aria-label") ||
              elemento.getAttribute("title") ||
              elemento.textContent?.trim().slice(0, 50) ||
              "(sin nombre)",
            tipo: elemento.tagName.toLowerCase(),
            x: rect.x,
            y: rect.y,
            ancho: rect.width,
            alto: rect.height,
            derecha: rect.right,
            abajo: rect.bottom,
            centroX: rect.x + rect.width / 2,
            centroY: rect.y + rect.height / 2,
          };
        });

      const pequenos = controles.filter(
        (control) => control.ancho < 24 || control.alto < 24
      );

      const revisiones = pequenos.map((control) => {
        const vecinos = controles
          .filter((otro) => otro.id !== control.id)
          .map((otro) => {
            // Distancia desde el centro del control pequeño
            // hasta el rectángulo del otro control.
            const dx = Math.max(
              otro.x - control.centroX,
              0,
              control.centroX - otro.derecha
            );

            const dy = Math.max(
              otro.y - control.centroY,
              0,
              control.centroY - otro.abajo
            );

            const distancia = Math.hypot(dx, dy);

            return {
              id: otro.id,
              nombre: otro.nombre,
              distancia: Number(distancia.toFixed(2)),
              invadeCirculo24: distancia < 12,
            };
          })
          .sort((a, b) => a.distancia - b.distancia);

        return {
          nombre: control.nombre,
          ancho: Number(control.ancho.toFixed(2)),
          alto: Number(control.alto.toFixed(2)),
          x: Number(control.x.toFixed(2)),
          y: Number(control.y.toFixed(2)),
          vecinoMasCercano: vecinos[0] ?? null,
          intersecciones: vecinos.filter(
            (vecino) => vecino.invadeCirculo24
          ),
        };
      });

      return {
        viewport: {
          width: innerWidth,
          height: innerHeight,
        },
        totalControles: controles.length,
        controlesPequenos: pequenos.length,
        revisiones,
      };
    });

    console.log("VIEWPORT:", resultado.viewport);
    console.log("TOTAL DE CONTROLES:", resultado.totalControles);
    console.log(
      "CONTROLES PEQUEÑOS:",
      resultado.controlesPequenos
    );

    for (const control of resultado.revisiones) {
      console.log("\nCONTROL:", control.nombre);
      console.log("DIMENSIONES:", control.ancho, "x", control.alto);
      console.log("POSICIÓN:", control.x, control.y);
      console.log(
        "VECINO MÁS CERCANO:",
        control.vecinoMasCercano
      );

      console.log(
        "INTERSECCIONES CON CÍRCULO DE 24 PX:",
        control.intersecciones
      );

      console.log(
        "RESULTADO PRELIMINAR:",
        control.intersecciones.length === 0
          ? "Sin intersecciones detectadas"
          : "Requiere revisión adicional"
      );
    }

    expect(resultado.totalControles).toBeGreaterThan(0);

    fs.mkdirSync("qa-tests/evidencias", { recursive: true });

    fs.writeFileSync(
      "qa-tests/evidencias/OL-TC-45_Espaciado.json",
      JSON.stringify(resultado, null, 2)
    );

    await page.screenshot({
      path: "qa-tests/evidencias/OL-TC-45_Espaciado.png",
      fullPage: true,
    });

    console.log("\nOL-TC-45: Inspección de espaciado completada.");
  }
);
