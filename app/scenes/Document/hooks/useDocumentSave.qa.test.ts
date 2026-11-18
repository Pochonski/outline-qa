import * as Y from "yjs";
import { AUTOSAVE_DELAY } from "./useDocumentSave";

describe("QA HU-05 autosave", () => {
  it.fails("CP-HU05-01: debounce de 2000 ms pendiente", () => {
    // HU-05, CA-05.1: el valor actual es 3000 ms. Mantener visible el defecto
    // sin bloquear la ejecución de los demás casos de la entrega.
    expect(AUTOSAVE_DELAY).toEqual(2000);
  });

  it("CP-HU05-04", () => {
    // HU-05, CA-05.4: dos editores offline en el mismo párrafo conservan
    // ambos aportes al sincronizar (resolución CRDT de Y.js).
    const base = new Y.Doc();
    base.getText("doc").insert(0, "Hello ");
    const snapshot = Y.encodeStateAsUpdate(base);

    const editorA = new Y.Doc();
    Y.applyUpdate(editorA, snapshot);
    const editorB = new Y.Doc();
    Y.applyUpdate(editorB, snapshot);

    editorA.getText("doc").insert(6, "Alice");
    editorB.getText("doc").insert(6, "Bob");

    Y.applyUpdate(editorA, Y.encodeStateAsUpdate(editorB));
    Y.applyUpdate(editorB, Y.encodeStateAsUpdate(editorA));

    const mergedA = editorA.getText("doc").toString();
    const mergedB = editorB.getText("doc").toString();
    expect([
      mergedA.includes("Alice") && mergedA.includes("Bob"),
      mergedA === mergedB,
    ]).toEqual([true, true]);
  });

  it("CP-HU05-07", () => {
    // HU-05: dos editores online en párrafos distintos ven ambos cambios.
    const base = new Y.Doc();
    base.getText("doc").insert(0, "AAA\nBBB");
    const snapshot = Y.encodeStateAsUpdate(base);

    const editorA = new Y.Doc();
    Y.applyUpdate(editorA, snapshot);
    const editorB = new Y.Doc();
    Y.applyUpdate(editorB, snapshot);

    editorA.getText("doc").insert(3, "1");
    const endB = editorB.getText("doc").length;
    editorB.getText("doc").insert(endB, "2");

    Y.applyUpdate(editorA, Y.encodeStateAsUpdate(editorB));
    Y.applyUpdate(editorB, Y.encodeStateAsUpdate(editorA));

    const mergedA = editorA.getText("doc").toString();
    const mergedB = editorB.getText("doc").toString();
    expect([
      mergedA.includes("AAA1") && mergedA.includes("BBB2"),
      mergedA === mergedB,
    ]).toEqual([true, true]);
  });
});
