import {
  test,
  expect,
} from "../../../../docs/proyecto/tools/playwright-fixtures";

test(
  "OL-TC-43 - Desplazamiento horizontal en tablas móviles",
  { annotation: { type: "qatlas", description: "OL-TC-43" } },
  async ({ qa }, info) => {
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
    const page = await qa.openDocument(documento);

    await page.setViewportSize({ width: 390, height: 844 });

    const tabla = page.locator(".table-scrollable").first();

    await test.step("Abrir documento con tabla en pantalla móvil", async () => {
      await expect(tabla).toBeVisible({ timeout: 20000 });
      await expect(tabla.locator("table")).toBeVisible();
    });

    await test.step("Comprobar dimensiones y desplazamiento horizontal", async () => {
      await expect
        .poll(
          () =>
            tabla.evaluate((elemento) => elemento.clientWidth),
          { timeout: 20000 }
        )
        .toBeGreaterThan(0);

      const resultado = await tabla.evaluate((elemento) => {
        const estilo = window.getComputedStyle(elemento);

        return {
          overflowX: estilo.overflowX,
          anchoVisible: elemento.clientWidth,
          anchoContenido: elemento.scrollWidth,
        };
      });

      expect(resultado.overflowX).toBe("auto");
      expect(resultado.anchoVisible).toBeGreaterThan(0);
      expect(resultado.anchoContenido).toBeGreaterThan(
        resultado.anchoVisible
      );

      const desplazamiento = await tabla.evaluate((elemento) => {
        elemento.scrollLeft = 100;
        return elemento.scrollLeft;
      });

      expect(desplazamiento).toBeGreaterThan(0);
    });

    await test.step("Comprobar que la página no se ensanche", async () => {
      const pagina = await page.evaluate(() => ({
        anchoVisible: document.documentElement.clientWidth,
        anchoTotal: document.documentElement.scrollWidth,
      }));

      expect(pagina.anchoTotal).toBeLessThanOrEqual(
        pagina.anchoVisible
      );
    });

    await info.attach("OL-TC-43_Tabla_Movil.png", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  }
);
