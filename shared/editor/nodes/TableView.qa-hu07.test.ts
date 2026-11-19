import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { doc, table, tr, td } from "@shared/test/editor";
import { TableView } from "./TableView";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

describe("HU-07 - Tablas en dispositivos móviles", () => {
  let tabla: ReturnType<typeof table>;
  let vista: TableView;
  let contenedor: Element | null;

  beforeEach(() => {
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

    tabla = documento.firstChild!;
    vista = new TableView(tabla, 100);
    contenedor = vista.dom.firstElementChild;
  });

  afterEach(() => {
    vista.destroy();
  });

  it.skipIf(typeof document === "undefined")(
    "OL-TC-43 - aplica el estilo de tabla",
    () => {
      expect(vista.dom.classList.contains(EditorStyleHelper.table)).toBe(true);
    }
  );

  it.skipIf(typeof document === "undefined")(
    "OL-TC-43 - crea el contenedor desplazable",
    () => {
      expect(contenedor).not.toBeNull();
    }
  );

  it.skipIf(typeof document === "undefined")(
    "OL-TC-43 - aplica el estilo desplazable",
    () => {
      expect(
        contenedor?.classList.contains(EditorStyleHelper.tableScrollable)
      ).toBe(true);
    }
  );

  it.skipIf(typeof document === "undefined")(
    "OL-TC-43 - contiene la tabla",
    () => {
      expect(contenedor?.contains(vista.table)).toBe(true);
    }
  );

  it.skipIf(typeof document === "undefined")(
    "OL-TC-43 - conserva las cinco columnas",
    () => {
      expect(tabla.firstChild?.childCount).toBe(5);
    }
  );
});
