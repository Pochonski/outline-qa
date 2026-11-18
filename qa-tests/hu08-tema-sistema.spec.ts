
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

const URL = "https://local.outline.dev:3000/settings/preferences";
const EVIDENCIAS = "qa-tests/evidencias";
const AUTH = "qa-tests/.auth/wiki.json";

test.setTimeout(120000);

type DatosTema = {
  preferenciaAnterior: string | null;
  uiStoreAnterior: string | null;
  preferenciaActual: string | null;
  uiStoreActual: string | null;
  temaSistema: boolean;
  fondo: string;
  texto: string;
};

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
    page.getByText("Appearance", { exact: true }).first()
  ).toBeVisible();

  await expect(
    page.getByText("Use pointer cursor", { exact: true }).first()
  ).toBeVisible();

  // Buscar el botón correspondiente al selector Appearance.
  const etiqueta = page.getByText("Appearance", { exact: true }).first();

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

    throw new Error("No se encontró el selector Appearance");
  });

  await expect(
    page.locator('[data-qa-appearance="true"]')
  ).toContainText("System", { timeout: 15000 });
}

async function obtenerDatos(page: Page): Promise<DatosTema> {
  return page.evaluate(() => {
    const w = window as any;

    return {
      preferenciaAnterior: w.__qaTemaAnterior ?? null,
      uiStoreAnterior: w.__qaUIStoreAnterior ?? null,
      preferenciaActual: localStorage.getItem("theme"),
      uiStoreActual: localStorage.getItem("UI_STORE"),
      temaSistema: window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches,
      fondo: getComputedStyle(document.body).backgroundColor,
      texto: getComputedStyle(document.body).color,
    };
  });
}

test(
  "OL-TC-49 - Deteccion automatica del tema del sistema",
  async ({ browser }) => {
    fs.mkdirSync(EVIDENCIAS, { recursive: true });

    // ================================================
    // PASOS 1 Y 2: SISTEMA OSCURO
    // ================================================

    const contextoOscuro = await browser.newContext({
      storageState: AUTH,
      ignoreHTTPSErrors: true,
      viewport: { width: 390, height: 844 },
      colorScheme: "dark",
    });

    // Se ejecuta ANTES del codigo de Outline.
    // Conservamos la autenticacion, pero eliminamos
    // las preferencias de tema en este contexto aislado.
    await contextoOscuro.addInitScript(() => {
      const w = window as any;

      w.__qaTemaAnterior = localStorage.getItem("theme");
      w.__qaUIStoreAnterior = localStorage.getItem("UI_STORE");

      localStorage.removeItem("theme");
      localStorage.removeItem("UI_STORE");
    });

    const paginaOscura = await contextoOscuro.newPage();

    await paginaOscura.goto(URL, {
      waitUntil: "domcontentloaded",
    });

    await esperarInterfaz(paginaOscura);

    const datosOscuros = await obtenerDatos(paginaOscura);

    console.log("\n====== PASO 1 ======");
    console.log("Preferencia eliminada antes de iniciar Outline");
    console.log("Sistema oscuro:", datosOscuros.temaSistema);
    console.log(
      "Preferencia actual:",
      datosOscuros.preferenciaActual
    );

    expect(datosOscuros.temaSistema).toBe(true);

    // Outline puede guardar "system" durante su inicio.
    // Eso no equivale a seleccionar manualmente Dark.
    expect(
      JSON.parse(datosOscuros.preferenciaActual ?? '"system"')
    ).toBe("system");

    console.log("\n====== PASO 2 ======");
    console.log("Color de fondo:", datosOscuros.fondo);
    console.log("Color de texto:", datosOscuros.texto);

    await expect.poll(
      async () =>
        paginaOscura.evaluate(
          () => getComputedStyle(document.body).backgroundColor
        ),
      { timeout: 15000 }
    ).toBe("rgb(0, 0, 0)");

    await paginaOscura.screenshot({
      path: `${EVIDENCIAS}/OL-TC-49_Paso2_Oscuro.png`,
      animations: "disabled",
    });

    console.log("PASO 2 - Tema oscuro automatico: CORRECTO");

    await contextoOscuro.close();

    // ================================================
    // PASO 3: SISTEMA CLARO
    // ================================================

    const contextoClaro = await browser.newContext({
      storageState: AUTH,
      ignoreHTTPSErrors: true,
      viewport: { width: 390, height: 844 },
      colorScheme: "light",
    });

    await contextoClaro.addInitScript(() => {
      const w = window as any;

      w.__qaTemaAnterior = localStorage.getItem("theme");
      w.__qaUIStoreAnterior = localStorage.getItem("UI_STORE");

      localStorage.removeItem("theme");
      localStorage.removeItem("UI_STORE");
    });

    const paginaClara = await contextoClaro.newPage();

    await paginaClara.goto(URL, {
      waitUntil: "domcontentloaded",
    });

    await esperarInterfaz(paginaClara);

    const datosClaros = await obtenerDatos(paginaClara);

    console.log("\n====== PASO 3 ======");
    console.log("Sistema oscuro:", datosClaros.temaSistema);
    console.log("Color de fondo:", datosClaros.fondo);
    console.log("Color de texto:", datosClaros.texto);
    console.log(
      "Preferencia actual:",
      datosClaros.preferenciaActual
    );

    expect(datosClaros.temaSistema).toBe(false);

    expect(
      JSON.parse(datosClaros.preferenciaActual ?? '"system"')
    ).toBe("system");

    await expect.poll(
      async () =>
        paginaClara.evaluate(
          () => getComputedStyle(document.body).backgroundColor
        ),
      { timeout: 15000 }
    ).toBe("rgb(255, 255, 255)");

    await paginaClara.screenshot({
      path: `${EVIDENCIAS}/OL-TC-49_Paso3_Claro.png`,
      animations: "disabled",
    });

    console.log("PASO 3 - Tema claro automatico: CORRECTO");

    await contextoClaro.close();

    console.log("\nOL-TC-49 - Comprobaciones finalizadas.");
  }
);
