import {
  test,
  expect,
  readDocument,
} from "../../../../docs/proyecto/tools/playwright-fixtures";
import { z } from "zod";

test(
  "CP-HU04-01 Crear documento como editor",
  { annotation: { type: "qatlas", description: "OL-TC-1" } },
  async ({ qa }) => {
    const document =
      await test.step("Crear un documento en una colección como editor", async () => {
        const response = await qa.post("documents.create", {
          collectionId: qa.actors.collectionId,
        });
        expect(response.status(), await response.text()).toBe(200);
        const created = await readDocument(response);
        qa.documents.push(created.id);
        return created;
      });
    await test.step("Comprobar el título por defecto y la apertura del editor", async () => {
      expect(
        document.title,
        "El payload debe devolver el título por defecto definido en el caso."
      ).toBe("Sin título");
      const page = await qa.openDocument(document);
      await expect(
        page.locator('.ProseMirror[contenteditable="true"]').first()
      ).toBeVisible();
    });
  }
);

test(
  "CP-HU04-02 Crear documento sin colección destino",
  { annotation: { type: "qatlas", description: "OL-TC-2" } },
  async ({ qa }) => {
    await test.step("Omitir collectionId y comprobar el rechazo sin crear documentos", async () => {
      const response = await qa.post("documents.create", {});
      if (response.status() === 200) {
        qa.documents.push((await readDocument(response)).id);
      }
      expect(response.status(), await response.text()).toBe(400);
    });
  }
);

test(
  "CP-HU04-03 Viewer intenta crear documento",
  { annotation: { type: "qatlas", description: "OL-TC-3" } },
  async ({ qa }) => {
    await test.step("Rechazar la creación de un viewer con authorization_error", async () => {
      const response = await qa.post(
        "documents.create",
        { collectionId: qa.actors.collectionId, title: "Viewer QA" },
        "viewer"
      );
      expect(response.status(), await response.text()).toBe(403);
      expect(
        z.object({ error: z.string() }).parse(await response.json()).error
      ).toBe("authorization_error");
    });
  }
);

test(
  "CP-HU04-04 Crear documento sin token",
  { annotation: { type: "qatlas", description: "OL-TC-4" } },
  async ({ qa }) => {
    await test.step("Rechazar una solicitud sin autenticación", async () => {
      const response = await qa.post(
        "documents.create",
        { collectionId: qa.actors.collectionId },
        null
      );
      expect(response.status(), await response.text()).toBe(401);
    });
  }
);

test(
  "CP-HU04-05 Guest intenta crear documento",
  { annotation: { type: "qatlas", description: "OL-TC-5" } },
  async ({ qa }) => {
    await test.step("Rechazar la creación de un guest", async () => {
      const response = await qa.post(
        "documents.create",
        { collectionId: qa.actors.collectionId, title: "Guest QA" },
        "guest"
      );
      expect(response.status(), await response.text()).toBe(403);
    });
  }
);
