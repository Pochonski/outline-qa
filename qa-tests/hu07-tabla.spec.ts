
import { test, expect } from "@playwright/test";

const URL_DOCUMENTO =
  "https://local.outline.dev:3000/doc/qa-hu-07-prueba-de-tabla-movil-2TvCokbah0";

test.use({
  viewport: { width: 390, height: 844 },
  ignoreHTTPSErrors: true,
  storageState: "qa-tests/.auth/wiki.json",
});

test(
  "OL-TC-43 - Desplazamiento horizontal en tablas móviles",
  async ({ page }) => {
    // Registrar errores de JavaScript.
    page.on("pageerror", (error) => {
      console.log("ERROR JS:", error.message);
    });

    // Registrar errores HTTP.
    page.on("response", (response) => {
      if (response.status() >= 400) {
        console.log(
          "ERROR HTTP:",
          response.status(),
          response.url().split("?")[0]
        );
      }
    });

    // Registrar problemas de conexión.
    page.on("requestfailed", (request) => {
      console.log(
        "ERROR CONEXIÓN:",
        request.url().split("?")[0],
        request.failure()?.errorText
      );
    });

    // Abrir el documento real de Outline.
    await page.goto(URL_DOCUMENTO, {
      waitUntil: "domcontentloaded",
    });

    console.log("URL FINAL:", page.url());
    console.log("TÍTULO DE LA PÁGINA:", await page.title());

    // Verificar que el documento esperado esté cargado.
    const titulo = page.getByText(
      "QA HU-07 - Prueba de tabla móvil"
    ).first();

    await expect(titulo).toBeVisible({
      timeout: 20000,
    });

    console.log("DOCUMENTO: Se encontró correctamente.");

    // Localizar el contenedor real de la tabla.
    const tabla = page.locator(".table-scrollable").first();

    await expect(tabla).toBeVisible({
      timeout: 20000,
    });

    // Esperar a que el contenedor tenga un ancho real.
    await expect.poll(
      async () =>
        tabla.evaluate((elemento) => elemento.clientWidth),
      {
        timeout: 20000,
        message: "La tabla debe tener un ancho visible mayor que cero",
      }
    ).toBeGreaterThan(0);

    // Esperar a que se aplique el estilo horizontal.
    await expect.poll(
      async () =>
        tabla.evaluate(
          (elemento) => window.getComputedStyle(elemento).overflowX
        ),
      {
        timeout: 20000,
        message: "El contenedor debe tener overflow-x: auto",
      }
    ).toBe("auto");

    console.log(
      "HTML DEL CONTENEDOR:",
      await tabla.evaluate((elemento) =>
        elemento.outerHTML.slice(0, 500)
      )
    );

    // PASO 2: Inspeccionar CSS y dimensiones.
    const resultado = await tabla.evaluate((elemento) => {
      const estilo = window.getComputedStyle(elemento);

      return {
        overflowX: estilo.overflowX,
        anchoVisible: elemento.clientWidth,
        anchoContenido: elemento.scrollWidth,
      };
    });

    console.log("RESULTADO OL-TC-43:", resultado);

    expect(resultado.overflowX).toBe("auto");

    expect(resultado.anchoVisible).toBeGreaterThan(0);

    expect(resultado.anchoContenido).toBeGreaterThan(
      resultado.anchoVisible
    );

    // Comprobar que el contenedor realmente se desplaza.
    const desplazamiento = await tabla.evaluate((elemento) => {
      elemento.scrollLeft = 100;
      return elemento.scrollLeft;
    });

    console.log("DESPLAZAMIENTO HORIZONTAL:", desplazamiento);

    expect(desplazamiento).toBeGreaterThan(0);

    // PASO 3: Comprobar que toda la página no se ensancha.
    const pagina = await page.evaluate(() => {
      const html = document.documentElement;

      return {
        anchoVisible: html.clientWidth,
        anchoTotal: html.scrollWidth,
      };
    });

    console.log("RESULTADO PÁGINA:", pagina);

    expect(pagina.anchoTotal).toBeLessThanOrEqual(
      pagina.anchoVisible
    );

    // Guardar captura de evidencia.
    await page.screenshot({
      path: "qa-tests/evidencias/OL-TC-43_Playwright.png",
      fullPage: true,
    });

    console.log(
      "OL-TC-43: Todas las comprobaciones pasaron correctamente."
    );
  }
);
