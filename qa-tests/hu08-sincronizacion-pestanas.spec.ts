
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

const URL = "https://local.outline.dev:3000/settings/preferences";
const CARPETA = "qa-tests/evidencias";

type Tema = "light" | "dark";

test.use({
  storageState: "qa-tests/.auth/wiki.json",
  ignoreHTTPSErrors: true,
  viewport: { width: 390, height: 844 },
  colorScheme: "light",
});

test.setTimeout(120000);

async function botonApariencia(page: Page) {
  const etiqueta = page.getByText("Appearance", { exact: true }).first();

  await expect(etiqueta).toBeVisible({ timeout: 30000 });

  await etiqueta.evaluate((elemento) => {
    let padre = elemento.parentElement;

    while (padre) {
      const botones = Array.from(
        padre.querySelectorAll<HTMLButtonElement>("button")
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

      padre = padre.parentElement;
    }

    throw new Error("No se encontro el boton Appearance");
  });

  return page.locator('[data-qa-appearance="true"]');
}

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
    page.getByText("Use pointer cursor", { exact: true }).first()
  ).toBeVisible();

  await botonApariencia(page);
}

async function seleccionarTema(page: Page, tema: Tema) {
  const boton = await botonApariencia(page);
  const nombre = tema === "dark" ? "Dark" : "Light";

  if (!(await boton.innerText()).includes(nombre)) {
    await boton.click();

    const opcion = page.getByText(nombre, { exact: true }).last();

    await expect(opcion).toBeVisible({ timeout: 10000 });
    await opcion.click();
  }

  await expect(boton).toContainText(nombre, {
    timeout: 15000,
  });

  await expect.poll(
    () =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("theme") ?? "null")
      ),
    { timeout: 15000 }
  ).toBe(tema);
}

async function datos(page: Page) {
  return page.evaluate(() => {
    let temaGuardado = null;

    try {
      temaGuardado = JSON.parse(
        localStorage.getItem("theme") ?? "null"
      );
    } catch {
      temaGuardado = localStorage.getItem("theme");
    }

    return {
      temaGuardado,
      fondo: getComputedStyle(document.body).backgroundColor,
      texto: getComputedStyle(document.body).color,
      url: location.href,
    };
  });
}

async function verificarTema(page: Page, tema: Tema) {
  const esperado =
    tema === "dark"
      ? "rgb(0, 0, 0)"
      : "rgb(255, 255, 255)";

  await expect.poll(
    async () =>
      page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor
      ),
    { timeout: 10000, intervals: [100, 250, 500] }
  ).toBe(esperado);

  const boton = await botonApariencia(page);

  await expect(boton).toContainText(
    tema === "dark" ? "Dark" : "Light",
    { timeout: 10000 }
  );

  const estado = await datos(page);
  expect(estado.temaGuardado).toBe(tema);

  return estado;
}

async function capturar(page: Page, nombre: string) {
  await page.screenshot({
    path: `${CARPETA}/${nombre}`,
    animations: "disabled",
    timeout: 15000,
  });
}

test(
  "OL-TC-51 - Sincronizacion del tema entre pestanas",
  async ({ context }) => {
    fs.mkdirSync(CARPETA, { recursive: true });

    const paginaA = await context.newPage();

    let navegacionesA = 0;
    let navegacionesB = 0;

    paginaA.on("framenavigated", (frame) => {
      if (frame === paginaA.mainFrame()) {
        navegacionesA++;
      }
    });

    // =========================================
    // PASO 1: DOS PESTANAS EN TEMA CLARO
    // =========================================

    await paginaA.goto(URL, {
      waitUntil: "domcontentloaded",
    });

    await esperarInterfaz(paginaA);
    await seleccionarTema(paginaA, "light");
    await verificarTema(paginaA, "light");

    const paginaB = await context.newPage();

    paginaB.on("framenavigated", (frame) => {
      if (frame === paginaB.mainFrame()) {
        navegacionesB++;
      }
    });

    await paginaB.goto(URL, {
      waitUntil: "domcontentloaded",
    });

    await esperarInterfaz(paginaB);
    await verificarTema(paginaB, "light");

    const inicialA = navegacionesA;
    const inicialB = navegacionesB;

    await capturar(
      paginaA,
      "OL-TC-51_Paso1_Pestana_A_Clara.png"
    );

    await capturar(
      paginaB,
      "OL-TC-51_Paso1_Pestana_B_Clara.png"
    );

    console.log("\n========== PASO 1 ==========");
    console.log("Pestana A:", await datos(paginaA));
    console.log("Pestana B:", await datos(paginaB));
    console.log("RESULTADO: ambas pestanas en claro");

    // =========================================
    // PASO 2: CAMBIAR A OSCURO EN A
    // =========================================

    await seleccionarTema(paginaA, "dark");

    const estadoAoscuro = await verificarTema(
      paginaA,
      "dark"
    );

    await capturar(
      paginaA,
      "OL-TC-51_Paso2_Pestana_A_Oscura.png"
    );

    console.log("\n========== PASO 2 ==========");
    console.log("Pestana A:", estadoAoscuro);
    console.log("RESULTADO: A cambio a oscuro");

    // =========================================
    // PASO 3: VERIFICAR B SIN RECARGAR
    // =========================================

    let sincronizoBOscuro = true;
    let errorBOscuro = "";

    try {
      await verificarTema(paginaB, "dark");
    } catch (error) {
      sincronizoBOscuro = false;
      errorBOscuro = String(error);
    }

    await capturar(
      paginaB,
      "OL-TC-51_Paso3_Pestana_B_Tras_Cambio.png"
    );

    console.log("\n========== PASO 3 ==========");
    console.log("Pestana B:", await datos(paginaB));
    console.log(
      "Navegaciones nuevas en B:",
      navegacionesB - inicialB
    );
    console.log(
      "Sincronizacion a oscuro:",
      sincronizoBOscuro ? "CORRECTO" : "FALLIDO"
    );

    if (!sincronizoBOscuro) {
      console.log("Detalle del fallo:", errorBOscuro);

      throw new Error(
        "OL-TC-51 PASO 3 FALLIDO: la pestana B no " +
        "se actualizo automaticamente al tema oscuro. " +
        "El paso 4 depende de este resultado y no se ejecuto."
      );
    }

    expect(navegacionesA).toBe(inicialA);
    expect(navegacionesB).toBe(inicialB);

    // =========================================
    // PASO 4: CAMBIAR A CLARO EN B
    // Y VERIFICAR A SIN RECARGAR
    // =========================================

    await seleccionarTema(paginaB, "light");
    await verificarTema(paginaB, "light");

    await capturar(
      paginaB,
      "OL-TC-51_Paso4_Pestana_B_Clara.png"
    );

    let sincronizoAClaro = true;
    let errorAClaro = "";

    try {
      await verificarTema(paginaA, "light");
    } catch (error) {
      sincronizoAClaro = false;
      errorAClaro = String(error);
    }

    await capturar(
      paginaA,
      "OL-TC-51_Paso4_Pestana_A_Tras_Cambio.png"
    );

    console.log("\n========== PASO 4 ==========");
    console.log("Pestana B:", await datos(paginaB));
    console.log("Pestana A:", await datos(paginaA));
    console.log(
      "Navegaciones nuevas en A:",
      navegacionesA - inicialA
    );
    console.log(
      "Navegaciones nuevas en B:",
      navegacionesB - inicialB
    );
    console.log(
      "Sincronizacion a claro:",
      sincronizoAClaro ? "CORRECTO" : "FALLIDO"
    );

    if (!sincronizoAClaro) {
      console.log("Detalle del fallo:", errorAClaro);

      throw new Error(
        "OL-TC-51 PASO 4 FALLIDO: la pestana A no " +
        "se actualizo automaticamente al tema claro."
      );
    }

    expect(navegacionesA).toBe(inicialA);
    expect(navegacionesB).toBe(inicialB);

    console.log(
      "\nOL-TC-51: todas las comprobaciones pasaron."
    );
  }
);
