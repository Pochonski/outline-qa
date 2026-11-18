import { describe, expect, it } from "vitest";
import { doc, table, tr, td } from "@shared/test/editor";
import { TableView } from "./TableView";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

describe("HU-07 - Tablas en dispositivos móviles", () => {
  it.skipIf(typeof document === "undefined")("OL-TC-43 - La tabla se crea dentro de un contenedor desplazable", () => {
    const documento = doc([
      table([
        tr([
          td("Columna 1"),
          td("Columna 2"),
          td("Columna 3"),
          td("Columna 4"),
          td("Columna 5"),
        ]),
      ]),
    ]);

    const tabla = documento.firstChild!;
    const vista = new TableView(tabla, 100);
    const contenedor = vista.dom.firstElementChild;

    expect(vista.dom.classList.contains(EditorStyleHelper.table)).toBe(true);
    expect(contenedor).not.toBeNull();
    expect(
      contenedor?.classList.contains(EditorStyleHelper.tableScrollable)
    ).toBe(true);
    expect(contenedor?.contains(vista.table)).toBe(true);
    expect(tabla.firstChild?.childCount).toBe(5);

    vista.destroy();
  });
});
