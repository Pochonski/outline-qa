
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
  "OL-TC-46 - Desplazamiento táctil de la barra móvil",
  async ({ page, browserName }) => {
    test.skip(
      browserName !== "chromium",
      "La prueba utiliza el protocolo táctil de Chromium"
    );

    fs.mkdirSync("qa-tests/evidencias", { recursive: true });

    await page.goto(URL_DOCUMENTO, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByText("QA HU-07 - Prueba de tabla móvil").first()
    ).toBeVisible({ timeout: 25000 });

    const editor = page
      .locator(".ProseMirror[contenteditable='true']")
      .first();

    await expect(editor).toBeVisible();

    await editor.tap();

    await expect(editor).toBeFocused();

    console.log("EDITOR: Toque y enfoque correctos.");

    // Buscar el contenedor horizontal de herramientas.
    const barra = page
      .locator("div")
      .filter({
        has: page.locator(
          'button[data-group], [role="button"][data-group]'
        ),
      })
      .filter({
        has: page.locator('[data-group="block"]'),
      })
      .last();

    // Diagnóstico de contenedores desplazables.
    const candidatos = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>("div"))
        .filter((elemento) => {
          const rect = elemento.getBoundingClientRect();
          const estilo = getComputedStyle(elemento);

          return (
            estilo.overflowX === "auto" &&
            elemento.scrollWidth > elemento.clientWidth &&
            rect.width > 0 &&
            rect.height > 0 &&
            rect.top >= 0 &&
            rect.bottom <= innerHeight
          );
        })
        .map((elemento) => {
          const rect = elemento.getBoundingClientRect();

          return {
            clase: elemento.className,
            x: rect.x,
            y: rect.y,
            ancho: rect.width,
            alto: rect.height,
            scrollWidth: elemento.scrollWidth,
            clientWidth: elemento.clientWidth,
            scrollLeft: elemento.scrollLeft,
          };
        })
    );

    console.log("CONTENEDORES CON SCROLL HORIZONTAL:");
    console.table(candidatos);

    // Identificar una barra desplazable que contenga
    // controles del editor.
    const indiceBarra = await page.evaluate(() => {
      const elementos = Array.from(
        document.querySelectorAll<HTMLElement>("div")
      );

      return elementos.findIndex((elemento) => {
        const estilo = getComputedStyle(elemento);

        return (
          estilo.overflowX === "auto" &&
          elemento.scrollWidth > elemento.clientWidth &&
          elemento.querySelector("[data-group]") !== null &&
          elemento.getBoundingClientRect().height > 0
        );
      });
    });

    expect(
      indiceBarra,
      "Debe existir una barra de herramientas desplazable"
    ).toBeGreaterThanOrEqual(0);

    const selectorBarra = page.locator("div").nth(indiceBarra);

    await expect(selectorBarra).toBeVisible();

    const antes = await selectorBarra.evaluate((elemento) => ({
      scrollLeft: elemento.scrollLeft,
      scrollWidth: elemento.scrollWidth,
      clientWidth: elemento.clientWidth,
    }));

    console.log("ANTES DEL SWIPE:", antes);

    await page.screenshot({
      path: "qa-tests/evidencias/OL-TC-46_Barra_Antes.png",
      fullPage: true,
    });

    // Realizar un gesto táctil horizontal en Chromium.
    const rect = await selectorBarra.boundingBox();

    expect(rect).not.toBeNull();

    const inicioX = Math.round(rect!.x + rect!.width * 0.8);
    const finalX = Math.round(rect!.x + rect!.width * 0.2);
    const y = Math.round(rect!.y + rect!.height / 2);

    const cliente = await page.context().newCDPSession(page);

    const enviarTouch = async (
      tipo: "touchStart" | "touchMove" | "touchEnd",
      x: number
    ) => {
      await cliente.send("Input.dispatchTouchEvent", {
        type: tipo,
        touchPoints:
          tipo === "touchEnd"
            ? []
            : [{ x: Math.round(x), y }],
      });
    };

    await enviarTouch("touchStart", inicioX);

    for (let paso = 1; paso <= 12; paso++) {
      const x = inicioX + ((finalX - inicioX) * paso) / 12;
      await enviarTouch("touchMove", x);
      await page.waitForTimeout(20);
    }

    await enviarTouch("touchEnd", finalX);

    await expect
      .poll(
        async () =>
          selectorBarra.evaluate((elemento) => elemento.scrollLeft),
        { timeout: 5000 }
      )
      .toBeGreaterThan(antes.scrollLeft);

    const despues = await selectorBarra.evaluate((elemento) => ({
      scrollLeft: elemento.scrollLeft,
      scrollWidth: elemento.scrollWidth,
      clientWidth: elemento.clientWidth,
    }));

    console.log("DESPUÉS DEL SWIPE:", despues);

    await expect(editor).toBeVisible();

    await page.screenshot({
      path: "qa-tests/evidencias/OL-TC-46_Barra_Despues.png",
      fullPage: true,
    });

    console.log(
      "RESULTADO: La barra móvil respondió al desplazamiento táctil."
    );
  }
);
