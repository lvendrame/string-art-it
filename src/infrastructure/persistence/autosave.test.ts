import { beforeEach, describe, expect, it } from "vitest";
import { EditorStore } from "../../application/document";
import { clearAutosave, loadAutosave, saveAutosave } from "./autosave";

describe("autosave", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns null when nothing was saved", () => {
    expect(loadAutosave()).toBeNull();
  });

  it("round-trips a project through localStorage", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });

    saveAutosave(store.toProjectFile());
    const loaded = loadAutosave();

    expect(loaded?.pinLayers[0].pinPaths).toHaveLength(1);
  });

  it("clearAutosave removes it", () => {
    const store = new EditorStore();
    saveAutosave(store.toProjectFile());
    clearAutosave();

    expect(loadAutosave()).toBeNull();
  });

  it("gracefully returns null for corrupted data instead of throwing", () => {
    window.localStorage.setItem("stringartit:autosave:v1", "{not json");
    expect(loadAutosave()).toBeNull();
  });
});
