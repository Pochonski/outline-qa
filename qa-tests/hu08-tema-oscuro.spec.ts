
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

const URL =
  "https://local.outline.dev:3000/settings/preferences";

const CARPETA = "qa-tests/evidencias";
const LIMITE_MS = 100;

test.use({
  viewport: { width: 390, height: 844 },
  ignoreHTTPSErrors: true,
  storageState: "qa-tests/.auth/wiki.json",
  colorScheme: "light",
});

test.setTimeout(60000);

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
        botones[0].setAttribute(
          "data-qa-appearance",
          "true"
        );
        return;
      }

      contenedor = contenedor.parentElement;
    }

    throw new Error("No se encontró Appearance.");
  });

  return page.locator('[data-qa-appearance="true"]');
}

async function abrirSelector(page: Page) {
  const boton = await buscarApariencia(page);
  await boton.click();
}

async function seleccionarTema(
  page: Page,
  tema: "Light" | "Dark"
) {
  await abrirSelector(page);

  const opcion = page
    .getByText(tema, { exact: true })
    .last();

  await expect(opcion).toBeVisible();
  await opcion.click();

  await expect
    .poll(() => leerTema(page))
    .toBe(tema.toLowerCase());
}

test(
  "OL-TC-47 - Medir actualización y transición del tema",
  async ({ page }) => {
    fs.mkdirSync(CARPETA, { recursive: true });

    await page.goto(URL, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByText("Preferences", { exact: true }).first()
    ).toBeVisible({ timeout: 25000 });

    // Establecer el tema claro.
    await seleccionarTema(page, "Light");

    console.log("TEMA INICIAL:", await leerTema(page));

    await page.screenshot({
      path: `${CARPETA}/OL-TC-47_Claro.png`,
      fullPage: true,
    });

    // Abrir las opciones de apariencia.
    await abrirSelector(page);

    const oscuro = page
      .getByText("Dark", { exact: true })
      .last();

    await expect(oscuro).toBeVisible();

    // Instrumentar la transición antes del clic.
    await page.evaluate(() => {
      type Registro = {
        clic: number | null;
        inicioActualizacion: number | null;
        finActualizacion: number | null;
        estilosAplicados: number | null;
        transicionLista: number | null;
        transicionTerminada: number | null;
        colorInicial: string;
        colorFinal: string | null;
        error: string | null;
      };

      const registro: Registro = {
        clic: null,
        inicioActualizacion: null,
        finActualizacion: null,
        estilosAplicados: null,
        transicionLista: null,
        transicionTerminada: null,
        colorInicial:
          getComputedStyle(document.body).color,
        colorFinal: null,
        error: null,
      };

      (window as any).__qaTema = registro;

      // Registrar cuándo ocurre el clic en Dark.
      document.addEventListener(
        "click",
        (evento) => {
          const elemento = evento.target;

          if (
            elemento instanceof Element &&
            elemento.closest(
              '[data-state], button, [role="option"]'
            )
          ) {
            registro.clic = performance.now();
          }
        },
        { capture: true, once: true }
      );

      const original =
        document.startViewTransition?.bind(document);

      if (original) {
        document.startViewTransition = ((callback: any) => {
          const transicion = original(async () => {
            registro.inicioActualizacion =
              performance.now();

            try {
              await callback();
            } finally {
              registro.finActualizacion =
                performance.now();

              registro.colorFinal =
                getComputedStyle(document.body).color;

              if (
                registro.colorFinal !==
                registro.colorInicial
              ) {
                registro.estilosAplicados =
                  performance.now();
              }
            }
          });

          transicion.ready.then(
            () => {
              registro.transicionLista =
                performance.now();
            },
            (error) => {
              registro.error =
                String(error);
            }
          );

          transicion.finished.then(
            () => {
              registro.transicionTerminada =
                performance.now();
            },
            (error) => {
              registro.error =
                String(error);
            }
          );

          return transicion;
        }) as typeof document.startViewTransition;
      } else {
        registro.error =
          "La API startViewTransition no está disponible.";
      }
    });

    // Clic real sobre Dark.
    await oscuro.click();

    await expect
      .poll(() => leerTema(page), {
        timeout: 10000,
      })
      .toBe("dark");

    // Esperar a que termine la transición o se registre un error.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const r = (window as any).__qaTema;

            return (
              r?.transicionTerminada !== null ||
              r?.error !== null
            );
          }),
        { timeout: 10000 }
      )
      .toBe(true);

    const registro = await page.evaluate(
      () => (window as any).__qaTema
    );

    const diferencia = (
      fin: number | null,
      inicio: number | null
    ) =>
      fin !== null && inicio !== null
        ? Number((fin - inicio).toFixed(2))
        : null;

    const resultados = {
      tema: await leerTema(page),
      tiempoClicActualizacionMs: diferencia(
        registro.finActualizacion,
        registro.clic
      ),
      tiempoEjecucionActualizacionMs: diferencia(
        registro.finActualizacion,
        registro.inicioActualizacion
      ),
      tiempoClicEstilosMs: diferencia(
        registro.estilosAplicados,
        registro.clic
      ),
      tiempoClicTransicionListaMs: diferencia(
        registro.transicionLista,
        registro.clic
      ),
      tiempoClicTransicionTerminadaMs: diferencia(
        registro.transicionTerminada,
        registro.clic
      ),
      colorInicial: registro.colorInicial,
      colorFinal: registro.colorFinal,
      limiteMs: LIMITE_MS,
      error: registro.error,
    };

    console.log("\nRESULTADOS OL-TC-47:");
    console.log(JSON.stringify(resultados, null, 2));

    console.log(
      "APLICACIÓN CSS EN 100 MS:",
      resultados.tiempoClicEstilosMs !== null
        ? resultados.tiempoClicEstilosMs <= LIMITE_MS
        : "NO MEDIDO"
    );

    console.log(
      "TRANSICIÓN TERMINADA EN 100 MS:",
      resultados.tiempoClicTransicionTerminadaMs !== null
        ? resultados.tiempoClicTransicionTerminadaMs <=
          LIMITE_MS
        : "NO MEDIDO"
    );

    // Verificar el almacenamiento.
    const almacenamiento = await page.evaluate(() => {
      const theme = localStorage.getItem("theme");
      const uiStore = localStorage.getItem("UI_STORE");

      return {
        theme: theme ? JSON.parse(theme) : null,
        uiStoreTheme: uiStore
          ? JSON.parse(uiStore).theme
          : null,
      };
    });

    console.log("LOCALSTORAGE:", almacenamiento);

    expect(almacenamiento.theme).toBe("dark");
    expect(almacenamiento.uiStoreTheme).toBe("dark");

    await page.keyboard.press("Escape");

    await page.screenshot({
      path: `${CARPETA}/OL-TC-47_Oscuro.png`,
      fullPage: true,
    });

    fs.writeFileSync(
      `${CARPETA}/OL-TC-47_Medicion_Detallada.json`,
      JSON.stringify(
        { resultados, almacenamiento },
        null,
        2
      )
    );

    // No aprobar o reprobar automáticamente los 100 ms:
    // primero se revisarán los dos tiempos registrados.
    expect(resultados.tema).toBe("dark");
    expect(resultados.error).toBeNull();
    expect(resultados.tiempoClicEstilosMs)
      .not.toBeNull();

    console.log(
      "OL-TC-47: Diagnóstico de tiempos completado."
    );
  }
);
