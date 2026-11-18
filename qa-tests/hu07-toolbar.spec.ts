
import { test, expect } from "@playwright/test";
import fs from "node:fs";

const URL_DOCUMENTO =
  "https://local.outline.dev:3000/doc/qa-hu-07-prueba-de-tabla-movil-2TvCokbah0";

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  ignoreHTTPSErrors: true,
  storageState: "qa-tests/.auth/wiki.json",
});

test.setTimeout(60000);

test(
  "OL-TC-46 - Barra de herramientas táctil del editor",
  async ({ page }) => {
    fs.mkdirSync("qa-tests/evidencias", { recursive: true });

    // PASO 1: Abrir el documento en un dispositivo móvil.
    await page.goto(URL_DOCUMENTO, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByText("QA HU-07 - Prueba de tabla móvil").first()
    ).toBeVisible({ timeout: 25000 });

    console.log("PASO 1 - Documento cargado.");

    console.log("VIEWPORT:", page.viewportSize());

    expect(page.viewportSize()).toEqual({
      width: 390,
      height: 844,
    });

    // Buscar el editor editable de Outline.
    const editor = page.locator(
      ".ProseMirror[contenteditable='true']"
    ).first();

    const cantidadEditores = await page.locator(
      ".ProseMirror[contenteditable='true']"
    ).count();

    console.log("EDITORES EDITABLES:", cantidadEditores);

    if (cantidadEditores === 0) {
      console.log(
        "No se encontró un editor editable. Es posible que " +
        "sea necesario activar el modo edición."
      );

      await page.screenshot({
        path: "qa-tests/evidencias/OL-TC-46_Diagnostico.png",
        fullPage: true,
      });
    }

    await expect(editor).toBeVisible({
      timeout: 10000,
    });

    console.log("PASO 1 - Editor editable encontrado.");

    // PASO 2: Simular un toque real en el editor.
    await editor.tap();

    await expect(editor).toBeFocused({
      timeout: 10000,
    });

    console.log("PASO 2 - Tap realizado y editor enfocado.");

    // Identificar barras de herramientas y sus botones.
    const herramientas = await page.evaluate(() => {
      const botones = Array.from(
        document.querySelectorAll<HTMLButtonElement>("button")
      );

      return botones
        .filter((boton) => {
          const rect = boton.getBoundingClientRect();
          const estilos = getComputedStyle(boton);

          return (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.left < innerWidth &&
            rect.right > 0 &&
            rect.top < innerHeight &&
            rect.bottom > 0 &&
            estilos.visibility !== "hidden" &&
            estilos.display !== "none"
          );
        })
        .map((boton) => {
          const rect = boton.getBoundingClientRect();

          return {
            nombre:
              boton.getAttribute("aria-label") ||
              boton.getAttribute("title") ||
              boton.textContent?.trim().slice(0, 40) ||
              "(sin nombre)",
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            ancho: Math.round(rect.width),
            alto: Math.round(rect.height),
          };
        });
    });

    console.log("BOTONES VISIBLES DESPUÉS DEL TAP:");
    console.table(herramientas);

    await page.screenshot({
      path: "qa-tests/evidencias/OL-TC-46_Tap.png",
      fullPage: true,
    });

    // PASO 3: Simular un gesto táctil de desplazamiento
    // utilizando eventos touch reales del navegador.
    const antes = await page.evaluate(() => window.scrollY);

    const centroX = 195;
    const inicioY = 650;
    const finalY = 350;

    await page.evaluate(
      async ({ x, inicio, fin }) => {
        // Los eventos sintéticos permiten inspeccionar
        // cómo responde el editor a una secuencia táctil.
        const objetivo =
          document.elementFromPoint(x, inicio) ||
          document.body;

        const crearTouch = (y: number) =>
          new Touch({
            identifier: 1,
            target: objetivo,
            clientX: x,
            clientY: y,
          });

        const emitir = (
          tipo: string,
          touches: Touch[],
          changedTouches: Touch[]
        ) => {
          objetivo.dispatchEvent(
            new TouchEvent(tipo, {
              bubbles: true,
              cancelable: true,
              touches,
              targetTouches: touches,
              changedTouches,
            })
          );
        };

        emitir("touchstart", [crearTouch(inicio)], [crearTouch(inicio)]);

        for (let paso = 1; paso <= 10; paso++) {
          const y = inicio + ((fin - inicio) * paso) / 10;

          emitir("touchmove", [crearTouch(y)], [crearTouch(y)]);

          await new Promise((resolve) => setTimeout(resolve, 20));
        }

        emitir("touchend", [], [crearTouch(fin)]);
      },
      { x: centroX, inicio: inicioY, fin: finalY }
    );

    const despues = await page.evaluate(() => window.scrollY);

    console.log("PASO 3 - Swipe simulado.");
    console.log("SCROLL ANTES:", antes);
    console.log("SCROLL DESPUÉS:", despues);

    await expect(editor).toBeVisible();

    console.log("EDITOR: Continúa disponible.");

    await page.screenshot({
      path: "qa-tests/evidencias/OL-TC-46_Swipe.png",
      fullPage: true,
    });

    fs.writeFileSync(
      "qa-tests/evidencias/OL-TC-46_Resultados.json",
      JSON.stringify(
        {
          viewport: page.viewportSize(),
          cantidadEditores,
          controlesVisibles: herramientas,
          scrollAntes: antes,
          scrollDespues: despues,
        },
        null,
        2
      )
    );

    console.log("OL-TC-46: Inspección táctil completada.");
  }
);
