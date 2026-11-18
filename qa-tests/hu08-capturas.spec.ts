
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

const URL =
  "https://local.outline.dev:3000/settings/preferences";

const CARPETA = "qa-tests/evidencias";

test.use({
  viewport: { width: 390, height: 844 },
  ignoreHTTPSErrors: true,
  storageState: "qa-tests/.auth/wiki.json",
  colorScheme: "light",
});

test.setTimeout(90000);

// Localizar el botón Appearance.
async function buscarApariencia(page: Page) {
  const etiqueta = page
    .getByText("Appearance", { exact: true })
    .first();

  await expect(etiqueta).toBeVisible();

  await etiqueta.evaluate((elemento) => {
    let contenedor = elemento.parentElement;

    while (contenedor) {
      const botones = Array.from(
        contenedor.querySelectorAll<HTMLButtonElement>("button")
      ).filter((boton) => {
        const estilo = getComputedStyle(boton);
        const rect = boton.getBoundingClientRect();

        return (
          estilo.display !== "none" &&
          estilo.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0
        );
      });

      if (botones.length === 1) {
        botones[0].setAttribute("data-qa-appearance", "true");
        return;
      }

      contenedor = contenedor.parentElement;
    }

    throw new Error("No se encontró Appearance.");
  });

  return page.locator('[data-qa-appearance="true"]');
}

// Esperar a que Preferences esté lista.
async function esperarInterfaz(page: Page) {
  await expect(
    page.getByText("Preferences", { exact: true }).first()
  ).toBeVisible({ timeout: 30000 });

  await expect(
    page.getByText("Display", { exact: true }).first()
  ).toBeVisible();

  await expect(
    page.getByText("Language", { exact: true }).first()
  ).toBeVisible();

  await expect(
    page.getByText("Use pointer cursor", {
      exact: true,
    }).first()
  ).toBeVisible();

  const boton = await buscarApariencia(page);

  await expect(boton).toContainText("Dark", {
    timeout: 15000,
  });

  await expect.poll(
    async () =>
      page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor
      ),
    { timeout: 15000 }
  ).toBe("rgb(0, 0, 0)");

  // Esperar a que desaparezcan transiciones activas.
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((animacion) =>
        animacion.finished.catch(() => {})
      )
    );
  });

  // Dar tiempo al navegador para presentar fotogramas.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      })
  );
}

// Activar Dark si todavía no está seleccionado.
async function activarOscuro(page: Page) {
  await expect(
    page.getByText("Preferences", { exact: true }).first()
  ).toBeVisible({ timeout: 30000 });

  const boton = await buscarApariencia(page);

  if ((await boton.innerText()).trim() !== "Dark") {
    await boton.click();

    const opcion = page
      .getByText("Dark", { exact: true })
      .last();

    await expect(opcion).toBeVisible();
    await opcion.click();
  }

  // Cerrar cualquier panel restante.
  await page.keyboard.press("Escape");

  await esperarInterfaz(page);
}

test(
  "OL-TC-48 - Generar evidencias visuales estables",
  async ({ page, context }) => {
    fs.mkdirSync(CARPETA, { recursive: true });

    // PASO 1: Abrir Outline con tema oscuro.
    await page.goto(URL, {
      waitUntil: "domcontentloaded",
    });

    await activarOscuro(page);

    await page.screenshot({
      path: `${CARPETA}/OL-TC-48_Inicial_CORREGIDA.png`,
      animations: "disabled",
    });

    console.log("PASO 1 - Captura inicial generada.");

    // PASO 2: Recargar la página.
    await page.reload({
      waitUntil: "domcontentloaded",
    });

    await esperarInterfaz(page);

    await page.screenshot({
      path: `${CARPETA}/OL-TC-48_Recarga_CORREGIDA.png`,
      animations: "disabled",
    });

    console.log("PASO 2 - Captura tras recarga generada.");

    // PASO 4: Abrir nueva pestaña del mismo contexto.
    const nuevaPagina = await context.newPage();

    await nuevaPagina.goto(URL, {
      waitUntil: "domcontentloaded",
    });

    await esperarInterfaz(nuevaPagina);

    await nuevaPagina.screenshot({
      path: `${CARPETA}/OL-TC-48_Nueva_Pestana_CORREGIDA.png`,
      animations: "disabled",
    });

    console.log("PASO 4 - Captura nueva pestaña generada.");

    console.log(
      "OL-TC-48: Tres evidencias visuales generadas."
    );
  }
);
