
import { beforeEach, describe, expect, it } from "vitest";
import UiStore from "./UiStore";
import type RootStore from "./RootStore";

describe("HU-07 - Comportamiento del menú móvil", () => {
  let ui: UiStore;

  beforeEach(() => {
    ui = new UiStore({} as RootStore);
  });

  it("HU07-AUTO-01 - El menú móvil inicia cerrado", () => {
    expect(ui.mobileSidebarVisible).toBe(false);
  });

  it("HU07-AUTO-02 - El menú móvil se abre", () => {
    ui.toggleMobileSidebar();

    expect(ui.mobileSidebarVisible).toBe(true);
  });

  it("HU07-AUTO-03 - El menú móvil se cierra", () => {
    ui.toggleMobileSidebar();
    ui.toggleMobileSidebar();

    expect(ui.mobileSidebarVisible).toBe(false);
  });

  it("HU07-AUTO-04 - El menú móvil puede ocultarse", () => {
    ui.toggleMobileSidebar();
    ui.hideMobileSidebar();

    expect(ui.mobileSidebarVisible).toBe(false);
  });
});
