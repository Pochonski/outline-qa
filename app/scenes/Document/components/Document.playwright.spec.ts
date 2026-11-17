import {
  test,
  expect,
} from "../../../../docs/proyecto/tools/playwright-fixtures";
import type {
  BrowserContext,
  Locator,
  Page,
  WebSocketRoute,
} from "@playwright/test";

function editor(page: Page): Locator {
  return page.locator('.ProseMirror[contenteditable="true"]').first();
}

async function insert(page: Page, text: string): Promise<void> {
  const input = editor(page);
  await input.click();
  await input.press("Control+End");
  await input.pressSequentially(text);
}

test(
  "CP-HU04-06 Indicador guardando visible",
  { annotation: { type: "qatlas", description: "OL-TC-6" } },
  async ({ qa }) => {
    const page = await qa.openDocument(await qa.createDocument());
    let lastKeystroke = 0;
    await test.step("Escribir y observar guardando…", async () => {
      await insert(page, " Indicador QA");
      lastKeystroke = Date.now();
      await expect
        .soft(page.getByText(/^guardando…$/i))
        .toBeVisible({ timeout: 2500 });
    });
    await test.step("Observar Guardado hh:mm:ss dentro del límite", async () => {
      await expect(page.getByText(/^Guardado \d{2}:\d{2}:\d{2}$/)).toBeVisible({
        timeout: Math.max(1, 2500 - (Date.now() - lastKeystroke)),
      });
      expect(Date.now() - lastKeystroke).toBeLessThanOrEqual(2500);
    });
  }
);

test(
  "CP-HU05-01 Debounce 2 segundos dispara guardado",
  { annotation: { type: "qatlas", description: "OL-TC-10" } },
  async ({ qa }) => {
    const page = await qa.openDocument(await qa.createDocument());
    await test.step("Comprobar debounce 2000 ms y una solicitud PATCH documents.update", async () => {
      await page.clock.install();
      await insert(page, " Debounce QA");
      const start = qa.calls.length;
      await page.clock.runFor(1999);
      expect(
        qa.calls
          .slice(start)
          .filter((call) => call.path === "/api/documents.update")
      ).toHaveLength(0);
      await page.clock.runFor(1);
      await expect
        .poll(
          () =>
            qa.calls
              .slice(start)
              .filter((call) => call.path === "/api/documents.update")
              .map((call) => call.method),
          { timeout: 1500 }
        )
        .toEqual(["PATCH"]);
    });
  }
);

test(
  "CP-HU05-02 Cerrar pestaña envía beacon",
  { annotation: { type: "qatlas", description: "OL-TC-11" } },
  async ({ qa }) => {
    const page = await qa.openDocument(await qa.createDocument());
    const beacons: Array<{ url: string; body: string }> = [];
    await page.exposeFunction(
      "qaCaptureBeacon",
      (url: string, body: string) => {
        beacons.push({ url, body });
      }
    );
    await page.addInitScript(() => {
      const original = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = (url, data) => {
        const capture = Reflect.get(window, "qaCaptureBeacon");
        if (typeof capture === "function") {
          if (data instanceof Blob) {
            void data.text().then((text) => capture(String(url), text));
          } else {
            void capture(
              String(url),
              typeof data === "string" ? data : "[binary beacon]"
            );
          }
        }
        return original(url, data);
      };
    });
    await page.reload();
    await test.step("Crear cambios pendientes sin esperar al autoguardado", async () => {
      await insert(page, " BEACON-PENDIENTE-QA");
      await expect(editor(page)).toContainText("BEACON-PENDIENTE-QA");
    });
    await test.step("Recargar y comprobar un beacon con el último estado pendiente", async () => {
      await page.reload();
      await expect
        .poll(
          () =>
            beacons.some((beacon) =>
              beacon.body.includes("BEACON-PENDIENTE-QA")
            ),
          { timeout: 2500 }
        )
        .toBe(true);
    });
  }
);

test(
  "CP-HU05-03 Reintento con backoff al recuperar red",
  { annotation: { type: "qatlas", description: "OL-TC-13" } },
  async ({ qa }, info) => {
    const page = await qa.openDocument(await qa.createDocument());
    await test.step("Provocar fallo de red y medir reintentos de 1, 3 y 9 segundos", async () => {
      const attempts: number[] = [];
      await page.route("**/api/documents.update", async (route) => {
        attempts.push(Date.now());
        if (attempts.length <= 3) {
          await route.abort("internetdisconnected");
          return;
        }
        await route.continue();
      });
      const failedRequest = page.waitForEvent("requestfailed", (request) =>
        request.url().includes("/api/documents.update")
      );
      await page.getByLabel("Título del documento").fill("Backoff QA");
      await failedRequest;
      await page.evaluate(() => window.dispatchEvent(new Event("online")));
      try {
        await expect.poll(() => attempts.length, { timeout: 18000 }).toBe(4);
        const intervals = attempts
          .slice(1)
          .map((time, index) => time - attempts[index]);
        for (const [index, expectedDelay] of [1000, 3000, 9000].entries()) {
          expect(
            Math.abs(intervals[index] - expectedDelay),
            `Intervalos reales ${JSON.stringify(intervals)} ms`
          ).toBeLessThanOrEqual(250);
        }
      } finally {
        await info.attach("backoff-timing.json", {
          body: Buffer.from(
            JSON.stringify({
              attempts,
              intervals: attempts
                .slice(1)
                .map((time, index) => time - attempts[index]),
            })
          ),
          contentType: "application/json",
        });
      }
    });
  }
);

test(
  "CP-HU05-04 Merge CRDT sin pérdida",
  { annotation: { type: "qatlas", description: "OL-TC-14" } },
  async ({ qa }) => {
    const document = await qa.createDocument("Párrafo compartido.");
    const sockets: WebSocketRoute[] = [];
    let offline = false;
    const configure = async (context: BrowserContext) => {
      await context.routeWebSocket("**/collaboration/**", (socket) => {
        if (offline) {
          void socket.close();
          return;
        }
        sockets.push(socket);
        socket.connectToServer();
      });
    };
    const a = await qa.openDocument(document, "editor", configure);
    const b = await qa.openDocument(document, "editorB", configure);
    await test.step("Editar el mismo párrafo con ambos clientes desconectados", async () => {
      await expect.poll(() => sockets.length).toBeGreaterThanOrEqual(2);
      offline = true;
      for (const socket of sockets) {
        await socket.close();
      }
      await Promise.all([
        a.context().setOffline(true),
        b.context().setOffline(true),
      ]);
      await insert(a, " APORTE-ALICE");
      await insert(b, " APORTE-BOB");
      await expect(editor(a)).toContainText("APORTE-ALICE");
      await expect(editor(a)).not.toContainText("APORTE-BOB");
      await expect(editor(b)).toContainText("APORTE-BOB");
      await expect(editor(b)).not.toContainText("APORTE-ALICE");
    });
    await test.step("Reconectar y comprobar convergencia sin pérdida", async () => {
      offline = false;
      await Promise.all([
        a.context().setOffline(false),
        b.context().setOffline(false),
      ]);
      for (const page of [a, b]) {
        await expect(editor(page)).toContainText("APORTE-ALICE", {
          timeout: 15000,
        });
        await expect(editor(page)).toContainText("APORTE-BOB");
      }
      expect(await editor(a).innerText()).toBe(await editor(b).innerText());
    });
  }
);

test(
  "CP-HU05-05 Sin cambios no dispara guardado",
  { annotation: { type: "qatlas", description: "OL-TC-15" } },
  async ({ qa }) => {
    const page = await qa.openDocument(await qa.createDocument());
    await test.step("Mantener el documento intacto cinco segundos y comprobar cero guardados", async () => {
      const start = qa.calls.length;
      await page.clock.install();
      await page.clock.runFor(5000);
      expect(
        qa.calls
          .slice(start)
          .filter((call) => call.path === "/api/documents.update")
      ).toHaveLength(0);
    });
  }
);

test(
  "CP-HU05-06 Agota tres intentos y avisa sin bloquear",
  { annotation: { type: "qatlas", description: "OL-TC-16" } },
  async ({ qa }) => {
    const page = await qa.openDocument(await qa.createDocument());
    await test.step("Agotar reintentos, mostrar error y mantener el editor habilitado", async () => {
      let attempts = 0;
      await page.route("**/api/documents.update", async (route) => {
        attempts++;
        await route.abort("internetdisconnected");
      });
      await page.getByLabel("Título del documento").fill("Guardado fallido QA");
      await expect(
        page.locator('[data-sonner-toast][data-type="error"]')
      ).toBeVisible({ timeout: 18000 });
      expect.soft(attempts, "El caso exige tres intentos fallidos.").toBe(3);
      await insert(page, " SIGO-EDITANDO");
      await expect(editor(page)).toContainText("SIGO-EDITANDO");
    });
  }
);

test(
  "CP-HU05-07 Edición concurrente en párrafos distintos",
  { annotation: { type: "qatlas", description: "OL-TC-17" } },
  async ({ qa }) => {
    const document = await qa.createDocument(
      "PRIMER-PARRAFO\n\nSEGUNDO-PARRAFO"
    );
    const a = await qa.openDocument(document);
    const b = await qa.openDocument(document, "editorB");
    await test.step("Editar en paralelo y observar ambos aportes en menos de un segundo", async () => {
      await Promise.all([
        (async () => {
          await editor(a).click();
          await editor(a).press("Control+Home");
          await editor(a).pressSequentially("APORTE-A ");
        })(),
        insert(b, " APORTE-B"),
      ]);
      await Promise.all([
        expect(editor(a)).toContainText("APORTE-B", { timeout: 999 }),
        expect(editor(b)).toContainText("APORTE-A", { timeout: 999 }),
      ]);
      expect(await editor(a).innerText()).toBe(await editor(b).innerText());
    });
  }
);
