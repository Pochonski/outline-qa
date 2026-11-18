
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

const URL = "https://local.outline.dev:3000/settings/preferences";
const CARPETA = "qa-tests/evidencias";

test.use({
  storageState: "qa-tests/.auth/wiki.json",
  ignoreHTTPSErrors: true,
  viewport: { width: 390, height: 844 },
  colorScheme: "light",
});

test.setTimeout(90000);

async function obtenerBotonApariencia(page: Page) {
  const etiqueta = page.getByText("Appearance", { exact: true }).first();

  await expect(etiqueta).toBeVisible({ timeout: 30000 });

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

  return page.locator('[data-qa-appearance="true"]');
}

async function esperarPreferencias(page: Page) {
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
    page.getByText("Use pointer cursor", { exact: true }).first()
  ).toBeVisible();
}

async function seleccionarSistema(page: Page) {
  await esperarPreferencias(page);

  const boton = await obtenerBotonApariencia(page);

  if (!(await boton.innerText()).includes("System")) {
    await boton.click();

    const opcion = page.getByText("System", { exact: true }).last();

    await expect(opcion).toBeVisible();
    await opcion.click();
  }

  await expect(boton).toContainText("System", {
    timeout: 15000,
  });

  // Confirmar que la preferencia persiste como System.
  await expect.poll(async () => {
    return page.evaluate(() => {
      const valor = localStorage.getItem("theme");
      return valor ? JSON.parse(valor) : null;
    });
  }).toBe("system");
}

async function verificarTema(
  page: Page,
  modo: "light" | "dark"
) {
  const fondoEsperado =
    modo === "light"
      ? "rgb(255, 255, 255)"
      : "rgb(0, 0, 0)";

  await expect.poll(
    () =>
      page.evaluate(
        () => getComputedStyle(document.body).backgroundColor
      ),
    { timeout: 15000 }
  ).toBe(fondoEsperado);

  const boton = await obtenerBotonApariencia(page);

  await expect(boton).toContainText("System");

  const datos = await page.evaluate(() => ({
    fondo: getComputedStyle(document.body).backgroundColor,
    texto: getComputedStyle(document.body).color,
    temaGuardado: JSON.parse(
      localStorage.getItem("theme") ?? "null"
    ),
    sistemaOscuro: matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches,
  }));

  expect(datos.temaGuardado).toBe("system");
  expect(datos.sistemaOscuro).toBe(modo === "dark");

  return datos;
}

async function capturar(page: Page, nombre: string) {
  // Esperar a que terminen las transiciones visuales.
  await page.evaluate(async () => {
    const animaciones = document
      .getAnimations()
      .filter((animacion) => animacion.playState === "running");

    await Promise.all(
      animaciones.map((animacion) =>
        animacion.finished.catch(() => {})
      )
    );

    await new Promise<void>((resolver) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolver());
      });
    });
  });

  await page.screenshot({
    path: `${CARPETA}/${nombre}`,
    animations: "disabled",
  });
}

test(
  "OL-TC-50 - Cambio automatico del tema segun el sistema",
  async ({ page }) => {
    fs.mkdirSync(CARPETA, { recursive: true });

    let navegaciones = 0;

    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        navegaciones++;
      }
    });

    // ==========================================
    // PASO 1: SYSTEM + LIGHT
    // ==========================================

    await page.goto(URL, {
      waitUntil: "domcontentloaded",
    });

    await seleccionarSistema(page);

    const paso1 = await verificarTema(page, "light");

    const navegacionesIniciales = navegaciones;

    await capturar(
      page,
      "OL-TC-50_Paso1_Sistema_Claro.png"
    );

    console.log("\n========== PASO 1 ==========");
    console.log("Preferencia seleccionada:", paso1.temaGuardado);
    console.log("Sistema oscuro:", paso1.sistemaOscuro);
    console.log("Color de fondo:", paso1.fondo);
    console.log("Color de texto:", paso1.texto);
    console.log("RESULTADO: tema claro correcto");

    // ==========================================
    // PASO 2: LIGHT -> DARK SIN RECARGAR
    // ==========================================

    await page.emulateMedia({ colorScheme: "dark" });

    const paso2 = await verificarTema(page, "dark");

    expect(navegaciones).toBe(navegacionesIniciales);

    await capturar(
      page,
      "OL-TC-50_Paso2_Cambio_Oscuro.png"
    );

    console.log("\n========== PASO 2 ==========");
    console.log("Sistema oscuro:", paso2.sistemaOscuro);
    console.log("Color de fondo:", paso2.fondo);
    console.log("Color de texto:", paso2.texto);
    console.log("Preferencia:", paso2.temaGuardado);
    console.log(
      "Navegaciones adicionales:",
      navegaciones - navegacionesIniciales
    );
    console.log("RESULTADO: cambio a oscuro sin recargar");

    // ==========================================
    // PASO 3: DARK -> LIGHT SIN RECARGAR
    // ==========================================

    await page.emulateMedia({ colorScheme: "light" });

    const paso3 = await verificarTema(page, "light");

    expect(navegaciones).toBe(navegacionesIniciales);

    await capturar(
      page,
      "OL-TC-50_Paso3_Regreso_Claro.png"
    );

    console.log("\n========== PASO 3 ==========");
    console.log("Sistema oscuro:", paso3.sistemaOscuro);
    console.log("Color de fondo:", paso3.fondo);
    console.log("Color de texto:", paso3.texto);
    console.log("Preferencia:", paso3.temaGuardado);
    console.log(
      "Navegaciones adicionales:",
      navegaciones - navegacionesIniciales
    );
    console.log("RESULTADO: regreso a claro sin recargar");

    console.log("\nOL-TC-50: comprobaciones finalizadas.");
  }
);
