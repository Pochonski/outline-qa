
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
  "OL-TC-46 - Verificar apertura del menú de inserción",
  async ({ page }) => {
    fs.mkdirSync("qa-tests/evidencias", { recursive: true });

    // PASO 1: Abrir documento móvil.
    await page.goto(URL_DOCUMENTO, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByText("QA HU-07 - Prueba de tabla móvil").first()
    ).toBeVisible({ timeout: 25000 });

    console.log("PASO 1 - Documento cargado correctamente.");
    console.log("VIEWPORT:", page.viewportSize());

    // Encontrar el editor.
    const editor = page
      .locator(".ProseMirror[contenteditable='true']")
      .first();

    await expect(editor).toBeVisible({ timeout: 15000 });

    await editor.tap();
    await expect(editor).toBeFocused();

    console.log("EDITOR: Editable y enfocado.");

    // PASO 2: Crear un párrafo temporal al final del documento
    // para activar el menú mediante "/".
    await editor.press("ControlOrMeta+End");
    await page.keyboard.press("Enter");

    console.log("PÁRRAFO TEMPORAL: Creado.");

    await page.keyboard.type("/");

    console.log("PASO 2 - Se escribió / en el editor.");

    // PASO 3: Comprobar que aparece el menú de sugerencias.
    const lista = page.getByRole("listbox", {
      name: "Suggestions",
    });

    await expect(lista).toBeVisible({ timeout: 15000 });

    const opciones = lista.getByRole("option");

    await expect
      .poll(async () => opciones.count(), {
        timeout: 10000,
        message: "El menú debe mostrar opciones de inserción",
      })
      .toBeGreaterThan(0);

    const nombres = await opciones.allTextContents();

    console.log("MENÚ DE INSERCIÓN: Abierto correctamente.");
    console.log("CANTIDAD DE OPCIONES:", nombres.length);
    console.log("OPCIONES DISPONIBLES:", nombres);

    // Guardar evidencia del menú abierto.
    await page.screenshot({
      path: "qa-tests/evidencias/OL-TC-46_BlockMenu_Abierto.png",
      fullPage: true,
    });

    // Comprobar que el editor sigue existiendo.
    await expect(editor).toBeVisible();

    console.log("EDITOR: Continúa disponible.");

    fs.writeFileSync(
      "qa-tests/evidencias/OL-TC-46_BlockMenu_Resultados.json",
      JSON.stringify(
        {
          viewport: page.viewportSize(),
          metodo: "Escribir / en el editor",
          menuAbierto: true,
          cantidadOpciones: nombres.length,
          opciones: nombres,
        },
        null,
        2
      )
    );

    // Intentar retirar la edición temporal.
    await page.keyboard.press("Escape");
    await editor.focus();
    await editor.press("ControlOrMeta+End");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");

    console.log("LIMPIEZA: Se intentó retirar el texto temporal.");
    console.log("OL-TC-46: Verificación de BlockMenu completada.");
  }
);
