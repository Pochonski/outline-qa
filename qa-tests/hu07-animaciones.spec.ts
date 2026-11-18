
import { test, expect } from "@playwright/test";

const URL_DOCUMENTO =
  "https://local.outline.dev:3000/doc/qa-hu-07-prueba-de-tabla-movil-2TvCokbah0";

test.use({
  viewport: { width: 390, height: 844 },
  ignoreHTTPSErrors: true,
  storageState: "qa-tests/.auth/wiki.json",
  reducedMotion: "reduce",
});

test(
  "OL-TC-44 - Reducción de animaciones en dispositivos móviles",
  async ({ page }) => {
    await page.goto(URL_DOCUMENTO, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByText("QA HU-07 - Prueba de tabla móvil").first()
    ).toBeVisible({ timeout: 20000 });

    // PASO 1: Verificar movimiento reducido.
    const movimientoReducido = await page.evaluate(() =>
      matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    console.log("PASO 1 - Movimiento reducido:", movimientoReducido);
    expect(movimientoReducido).toBe(true);

    const sidebar = page.locator("#sidebar");
    await expect(sidebar).toHaveCount(1);

    // La barra lateral debe iniciar fuera de la pantalla.
    const posicionInicial = await sidebar.evaluate(
      (elemento) => elemento.getBoundingClientRect().x
    );

    console.log("POSICIÓN INICIAL DEL MENÚ:", posicionInicial);
    expect(posicionInicial).toBeLessThan(0);

    // PASO 2: Probar el botón identificado en el diagnóstico.
    // Es el décimo botón visible, índice 9.
    const botonMenu = page.locator("button:visible").nth(9);

    console.log(
      "BOTÓN SELECCIONADO:",
      await botonMenu.evaluate((elemento) =>
        elemento.outerHTML.slice(0, 350)
      )
    );

    await botonMenu.click({ timeout: 5000 });

    // Verificar que el clic realmente abrió el menú.
    await expect
      .poll(
        async () =>
          sidebar.evaluate(
            (elemento) => elemento.getBoundingClientRect().x
          ),
        { timeout: 5000 }
      )
      .toBeGreaterThanOrEqual(0);

    console.log("PASO 2 - Menú móvil abierto correctamente.");

    // PASO 3: Medir las duraciones CSS después del clic.
    const resultado = await sidebar.evaluate((elemento) => {
      const estilos = getComputedStyle(elemento);

      return {
        animationDuration: estilos.animationDuration,
        transitionDuration: estilos.transitionDuration,
        animationIterationCount: estilos.animationIterationCount,
        scrollBehavior: estilos.scrollBehavior,
      };
    });

    console.log("PASO 3 - ESTILOS CALCULADOS:", resultado);

    const convertirASegundos = (valor: string) => {
      const texto = valor.trim();

      return texto.endsWith("ms")
        ? parseFloat(texto) / 1000
        : parseFloat(texto);
    };

    for (const duracion of resultado.transitionDuration.split(",")) {
      const segundos = convertirASegundos(duracion);

      expect(Number.isFinite(segundos)).toBe(true);
      expect(segundos).toBeLessThanOrEqual(0.000011);
    }

    for (const duracion of resultado.animationDuration.split(",")) {
      const segundos = convertirASegundos(duracion);

      expect(Number.isFinite(segundos)).toBe(true);
      expect(segundos).toBeLessThanOrEqual(0.000011);
    }

    expect(resultado.animationIterationCount).toBe("1");

    // Guardar evidencia.
    await page.screenshot({
      path: "qa-tests/evidencias/OL-TC-44_Playwright.png",
      fullPage: true,
    });

    console.log("OL-TC-44: Todas las comprobaciones pasaron.");
  }
);
