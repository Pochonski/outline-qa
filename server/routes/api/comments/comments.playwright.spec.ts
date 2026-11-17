import { z } from "zod";
import {
  test,
  expect,
  readComment,
} from "../../../../docs/proyecto/tools/playwright-fixtures";
import type {
  QaContext,
  QaComment,
  QaDocument,
} from "../../../../docs/proyecto/tools/playwright-fixtures";

async function prepareComment(
  qa: QaContext
): Promise<{ document: QaDocument; comment: QaComment }> {
  const document = await qa.createDocument();
  const response = await qa.post("comments.create", {
    documentId: document.id,
    text: "Comentario original QA",
  });
  expect(response.status(), await response.text()).toBe(200);
  return { document, comment: await readComment(response) };
}

test(
  "CP-HU06-01 Autor edita su comentario",
  { annotation: { type: "qatlas", description: "OL-TC-18" } },
  async ({ qa }) => {
    const { comment } = await prepareComment(qa);
    await test.step("Editar contenido y comprobar timestamp de modificación", async () => {
      const response = await qa.post("comments.update", {
        id: comment.id,
        text: "Comentario modificado QA",
      });
      expect(response.status(), await response.text()).toBe(200);
      const updated = await readComment(response);
      expect(updated.data.content?.[0]?.content?.[0]?.text).toBe(
        "Comentario modificado QA"
      );
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
        new Date(comment.updatedAt).getTime()
      );
      const persisted = await readComment(
        await qa.post("comments.info", { id: comment.id })
      );
      expect(persisted.data).toEqual(updated.data);
    });
  }
);

test(
  "CP-HU06-02 No autor intenta editar",
  { annotation: { type: "qatlas", description: "OL-TC-19" } },
  async ({ qa }) => {
    const { comment } = await prepareComment(qa);
    await test.step("Rechazar la edición ajena y conservar el contenido original", async () => {
      const response = await qa.post(
        "comments.update",
        { id: comment.id, text: "Cambio ajeno" },
        "editorB"
      );
      expect(response.status(), await response.text()).toBe(403);
      expect(
        z.object({ error: z.string() }).parse(await response.json()).error
      ).toBe("authorization_error");
      expect(
        (await readComment(await qa.post("comments.info", { id: comment.id })))
          .data
      ).toEqual(comment.data);
    });
  }
);

test(
  "CP-HU06-03 Autor elimina con borrado lógico",
  { annotation: { type: "qatlas", description: "OL-TC-21" } },
  async ({ qa }) => {
    const { comment, document } = await prepareComment(qa);
    await test.step("Eliminar, comprobar deletedAt y ausencia en comments.list", async () => {
      const response = await qa.post("comments.delete", { id: comment.id });
      expect(response.status(), await response.text()).toBe(200);
      expect(await qa.deletedAt(comment.id)).not.toBeNull();
      const list = z
        .object({ data: z.array(z.object({ id: z.string() })) })
        .parse(
          await (
            await qa.post("comments.list", { documentId: document.id })
          ).json()
        );
      expect(list.data.some((item) => item.id === comment.id)).toBe(false);
    });
  }
);

test(
  "CP-HU06-04 Resolver comentario",
  { annotation: { type: "qatlas", description: "OL-TC-22" } },
  async ({ qa }) => {
    const { comment } = await prepareComment(qa);
    await test.step("Resolver el comentario y comprobar resolvedAt persistido", async () => {
      const response = await qa.post("comments.resolve", { id: comment.id });
      expect(response.status(), await response.text()).toBe(200);
      expect((await readComment(response)).resolvedAt).not.toBeNull();
      expect(
        (await readComment(await qa.post("comments.info", { id: comment.id })))
          .resolvedAt
      ).not.toBeNull();
    });
  }
);

test(
  "CP-HU06-05 No autor intenta eliminar",
  { annotation: { type: "qatlas", description: "OL-TC-39" } },
  async ({ qa }) => {
    const { comment, document } = await prepareComment(qa);
    await test.step("Rechazar la eliminación ajena y mantener el comentario visible", async () => {
      const response = await qa.post(
        "comments.delete",
        { id: comment.id },
        "editorB"
      );
      expect(response.status(), await response.text()).toBe(403);
      expect(await qa.deletedAt(comment.id)).toBeNull();
      const list = z
        .object({ data: z.array(z.object({ id: z.string() })) })
        .parse(
          await (
            await qa.post("comments.list", { documentId: document.id })
          ).json()
        );
      expect(list.data.some((item) => item.id === comment.id)).toBe(true);
    });
  }
);

test(
  "CP-HU06-06 Editar con texto vacío",
  { annotation: { type: "qatlas", description: "OL-TC-40" } },
  async ({ qa }) => {
    const { comment } = await prepareComment(qa);
    await test.step("Rechazar el texto vacío y conservar el original", async () => {
      const response = await qa.post("comments.update", {
        id: comment.id,
        text: "",
      });
      expect(response.status(), await response.text()).toBe(400);
      expect(
        (await readComment(await qa.post("comments.info", { id: comment.id })))
          .data
      ).toEqual(comment.data);
    });
  }
);

test(
  "CP-HU06-07 Reabrir comentario resuelto",
  { annotation: { type: "qatlas", description: "OL-TC-41" } },
  async ({ qa }) => {
    const { comment } = await prepareComment(qa);
    expect(
      (await qa.post("comments.resolve", { id: comment.id })).status()
    ).toBe(200);
    await test.step("Reabrir y comprobar resolvedAt nulo", async () => {
      const response = await qa.post("comments.unresolve", { id: comment.id });
      expect(response.status(), await response.text()).toBe(200);
      expect((await readComment(response)).resolvedAt).toBeNull();
      expect(
        (await readComment(await qa.post("comments.info", { id: comment.id })))
          .resolvedAt
      ).toBeNull();
    });
  }
);
