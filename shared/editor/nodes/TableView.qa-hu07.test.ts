
import { describe, expect, it } from "vitest";
import { doc, table, tr, td } from "@shared/test/editor";
import { TableView } from "./TableView";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

describe("HU-07 - Tablas en dispositivos móviles", () => {
  it("OL-TC-43 - La tabla se crea dentro de un contenedor desplazable", () => {
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

    // Comprobar el contenedor de la tabla
    expect(
      vista.dom.classList.contains(EditorStyleHelper.table)
    ).toBe(true);

    // Comprobar el contenedor preparado para desplazamiento
    expect(
      vista.scrollable.classList.contains(
        EditorStyleHelper.tableScrollable
      )
    ).toBe(true);

    // Comprobar que la tabla está dentro del contenedor
    expect(vista.scrollable.contains(vista.table)).toBe(true);



    // Comprobar que la tabla tiene cinco columnas
    expect(tabla.firstChild?.childCount).toBe(5);

    vista.destroy();
  });
});
