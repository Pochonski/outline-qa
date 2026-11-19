import type { Locator, Page } from "@playwright/test";
import {
  test,
  expect,
} from "../../../../docs/proyecto/tools/playwright-fixtures";

test.describe("OL-TC-43 - Desplazamiento horizontal en tablas móviles", () => {
  const caso = { annotation: { type: "qatlas", description: "OL-TC-43" } };
  let page: Page;
  let tabla: Locator;
  let resultado: {
    overflowX: string;
    anchoVisible: number;
    anchoContenido: number;
  };
  let desplazamiento: number;
  let pagina: { anchoVisible: number; anchoTotal: number };

  test.beforeEach(async ({ qa }) => {
    const columnas = Array.from(
      { length: 20 },
      (_, indice) => `Columna ${indice + 1}`
    );
    const tablaMarkdown = [
      `| ${columnas.join(" | ")} |`,
      `| ${columnas.map(() => "---").join(" | ")} |`,
      `| ${columnas.map((_, indice) => `Dato ${indice + 1}`).join(" | ")} |`,
    ].join("\n");

    const documento = await qa.createDocument(tablaMarkdown);
    page = await qa.openDocument(documento);
    await page.setViewportSize({ width: 390, height: 844 });
    tabla = page.locator(".table-scrollable").first();

    await tabla.waitFor({ state: "visible", timeout: 20000 });
    await tabla.locator("table").waitFor({ state: "visible" });
    await page.waitForFunction(
      () => (document.querySelector(".table-scrollable")?.clientWidth ?? 0) > 0,
      undefined,
      { timeout: 20000 }
    );

    resultado = await tabla.evaluate((elemento) => {
      const estilo = window.getComputedStyle(elemento);
      return {
        overflowX: estilo.overflowX,
        anchoVisible: elemento.clientWidth,
        anchoContenido: elemento.scrollWidth,
      };
    });

    desplazamiento = await tabla.evaluate((elemento) => {
      elemento.scrollLeft = 100;
      return elemento.scrollLeft;
    });

    pagina = await page.evaluate(() => ({
      anchoVisible: document.documentElement.clientWidth,
      anchoTotal: document.documentElement.scrollWidth,
    }));
  });

  test.afterEach(async ({ qa: _qa }, info) => {
    await info.attach("OL-TC-43_Tabla_Movil.png", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });

  test("OL-TC-43 - muestra el contenedor de tabla", caso, async () => {
    await test.step("Abrir documento con tabla en pantalla móvil", async () => {
      await expect(tabla).toBeVisible({ timeout: 20000 });
    });
  });

  test("OL-TC-43 - muestra la tabla", caso, async () => {
    await test.step("Abrir documento con tabla en pantalla móvil", async () => {
      await expect(tabla.locator("table")).toBeVisible();
    });
  });

  test("OL-TC-43 - obtiene ancho positivo", caso, async () => {
    await test.step("Comprobar dimensiones y desplazamiento horizontal", async () => {
      await expect
        .poll(() => tabla.evaluate((elemento) => elemento.clientWidth), {
          timeout: 20000,
        })
        .toBeGreaterThan(0);
    });
  });

  test("OL-TC-43 - permite desbordamiento horizontal", caso, async () => {
    await test.step("Comprobar dimensiones y desplazamiento horizontal", async () => {
      expect(resultado.overflowX).toBe("auto");
    });
  });

  test("OL-TC-43 - conserva ancho visible positivo", caso, async () => {
    await test.step("Comprobar dimensiones y desplazamiento horizontal", async () => {
      expect(resultado.anchoVisible).toBeGreaterThan(0);
    });
  });

  test("OL-TC-43 - contenido excede ancho visible", caso, async () => {
    await test.step("Comprobar dimensiones y desplazamiento horizontal", async () => {
      expect(resultado.anchoContenido).toBeGreaterThan(resultado.anchoVisible);
    });
  });

  test("OL-TC-43 - responde al desplazamiento", caso, async () => {
    await test.step("Comprobar dimensiones y desplazamiento horizontal", async () => {
      expect(desplazamiento).toBeGreaterThan(0);
    });
  });

  test("OL-TC-43 - no ensancha la página", caso, async () => {
    await test.step("Comprobar que la página no se ensanche", async () => {
      expect(pagina.anchoTotal).toBeLessThanOrEqual(pagina.anchoVisible);
    });
  });
});
