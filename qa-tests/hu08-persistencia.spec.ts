
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

// Leer un valor JSON de localStorage.
async function leerTema(page: Page) {
  return page.evaluate(() => {
    const valor = localStorage.getItem("theme");

    if (!valor) return null;

    try {
      return JSON.parse(valor);
    } catch {
      return valor;
    }
  });
}

// Leer la preferencia principal de Outline.
async function leerUIStore(page: Page) {
  return page.evaluate(() => {
    const valor = localStorage.getItem("UI_STORE");

    if (!valor) return null;

    try {
      return JSON.parse(valor).theme ?? null;
    } catch {
      return null;
    }
  });
}

// Obtener el color de fondo y del texto.
async function obtenerColores(page: Page) {
  return page.evaluate(() => ({
    fondo: getComputedStyle(document.body).backgroundColor,
    texto: getComputedStyle(document.body).color,
  }));
}

// Esperar a que aparezcan las preferencias.
async function esperarPreferencias(page: Page) {
  await expect(
    page.getByText("Preferences", {
      exact: true,
    }).first()
  ).toBeVisible({ timeout: 25000 });
}

// Encontrar el selector Appearance.
async function buscarApariencia(page: Page) {
  const etiqueta = page
    .getByText("Appearance", {
      exact: true,
    })
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
        botones[0].setAttribute(
          "data-qa-appearance",
          "true"
        );
        return;
      }

      contenedor = contenedor.parentElement;
    }

    throw new Error(
      "No se encontró el selector Appearance."
    );
  });

  return page.locator('[data-qa-appearance="true"]');
}

// Cambiar el tema desde la interfaz.
async function seleccionarOscuro(page: Page) {
  const boton = await buscarApariencia(page);

  await boton.click();

  const oscuro = page
    .getByText("Dark", { exact: true })
    .last();

  await expect(oscuro).toBeVisible();
  await oscuro.click();

  await expect
    .poll(() => leerTema(page), {
      timeout: 10000,
    })
    .toBe("dark");

  await expect
    .poll(() => leerUIStore(page), {
      timeout: 10000,
    })
    .toBe("dark");
}

// Comprobar el tema y el fondo negro.
async function comprobarOscuro(page: Page) {
  await expect
    .poll(() => leerTema(page))
    .toBe("dark");

  await expect
    .poll(() => leerUIStore(page))
    .toBe("dark");

  await expect
    .poll(async () => {
      const colores = await obtenerColores(page);
      return colores.fondo;
    })
    .toBe("rgb(0, 0, 0)");
}

test(
  "OL-TC-48 - Persistencia del tema oscuro al recargar",
  async ({ page, context }) => {
    fs.mkdirSync(CARPETA, { recursive: true });

    // PASO 1: Abrir Outline.
    await page.goto(URL, {
      waitUntil: "domcontentloaded",
    });

    await esperarPreferencias(page);

    // Establecer Dark utilizando la interfaz real.
    await seleccionarOscuro(page);

    // Esperar a que el menú se cierre.
    await page.keyboard.press("Escape");

    await comprobarOscuro(page);

    const temaInicial = await leerTema(page);
    const coloresIniciales = await obtenerColores(page);

    console.log("PASO 1 - TEMA INICIAL:", temaInicial);
    console.log("PASO 1 - COLORES:", coloresIniciales);

    await page.screenshot({
      path: `${CARPETA}/OL-TC-48_Inicial.png`,
      fullPage: true,
      animations: "disabled",
    });

    // Instrumentación para observar los primeros
    // fotogramas tras la recarga.
    // No modifica la preferencia del usuario.
    await page.addInitScript(() => {
      const muestras: Array<{
        tiempo: number;
        fondo: string;
      }> = [];

      (window as any).__qaMuestrasColor = muestras;

      let cantidad = 0;

      const observar = () => {
        if (document.body) {
          muestras.push({
            tiempo: performance.now(),
            fondo:
              getComputedStyle(document.body)
                .backgroundColor,
          });

          cantidad++;
        }

        if (cantidad < 90) {
          requestAnimationFrame(observar);
        }
      };

      requestAnimationFrame(observar);
    });

    // PASO 2: Recargar la página.
    await page.reload({
      waitUntil: "domcontentloaded",
    });

    await esperarPreferencias(page);
    await comprobarOscuro(page);

    const temaRecargado = await leerTema(page);
    const coloresRecargados = await obtenerColores(page);

    console.log(
      "PASO 2 - TEMA TRAS RECARGA:",
      temaRecargado
    );

    console.log(
      "PASO 2 - COLORES:",
      coloresRecargados
    );

    await page.screenshot({
      path: `${CARPETA}/OL-TC-48_Recarga.png`,
      fullPage: true,
      animations: "disabled",
    });

    // PASO 3: Examinar las primeras muestras de color.
    const muestras = await page.evaluate(
      () => (window as any).__qaMuestrasColor ?? []
    );

    const muestrasBlancas = muestras.filter(
      (m: { fondo: string }) =>
        m.fondo === "rgb(255, 255, 255)"
    );

    console.log(
      "PASO 3 - MUESTRAS ANALIZADAS:",
      muestras.length
    );

    console.log(
      "PASO 3 - MUESTRAS BLANCAS:",
      muestrasBlancas.length
    );

    console.log(
      "PASO 3 - PRIMERAS MUESTRAS:",
      muestras.slice(0, 10)
    );

    // Guardar las muestras antes de abrir otra pestaña.
    fs.writeFileSync(
      `${CARPETA}/OL-TC-48_Muestras_Color.json`,
      JSON.stringify(muestras, null, 2)
    );

    // PASO 4: Abrir una pestaña nueva en el
    // mismo contexto y perfil del navegador.
    const nuevaPagina = await context.newPage();

    await nuevaPagina.goto(URL, {
      waitUntil: "domcontentloaded",
    });

    await esperarPreferencias(nuevaPagina);
    await comprobarOscuro(nuevaPagina);

    const temaNuevaPestana =
      await leerTema(nuevaPagina);

    const uiStoreNuevaPestana =
      await leerUIStore(nuevaPagina);

    const coloresNuevaPestana =
      await obtenerColores(nuevaPagina);

    console.log(
      "PASO 4 - TEMA NUEVA PESTAÑA:",
      temaNuevaPestana
    );

    console.log(
      "PASO 4 - UI_STORE:",
      uiStoreNuevaPestana
    );

    console.log(
      "PASO 4 - COLORES:",
      coloresNuevaPestana
    );

    await nuevaPagina.screenshot({
      path: `${CARPETA}/OL-TC-48_Nueva_Pestana.png`,
      fullPage: true,
      animations: "disabled",
    });

    const resultados = {
      viewport: page.viewportSize(),
      temaInicial,
      coloresIniciales,
      temaRecargado,
      coloresRecargados,
      muestrasAnalizadas: muestras.length,
      muestrasBlancas: muestrasBlancas.length,
      temaNuevaPestana,
      uiStoreNuevaPestana,
      coloresNuevaPestana,
      destelloVisualDefinitivamenteDescartado: false,
    };

    fs.writeFileSync(
      `${CARPETA}/OL-TC-48_Resultados.json`,
      JSON.stringify(resultados, null, 2)
    );

    expect(temaInicial).toBe("dark");
    expect(temaRecargado).toBe("dark");
    expect(temaNuevaPestana).toBe("dark");

    // El paso 3 es diagnóstico. Las muestras
    // no demuestran por sí solas ausencia total de flash.
    expect(muestras.length).toBeGreaterThan(0);

    console.log(
      "\nOL-TC-48: Persistencia y comprobaciones completadas."
    );

    console.log(
      "PASO 3: Revisar muestras y evidencia visual antes de aprobar."
    );
  }
);
