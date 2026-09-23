import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";
import {
  migrateProjectFile,
  serializeProject,
  createEmptyProject,
  projectFileToDocument,
  IncompatibleProjectVersionError,
  InvalidProjectFileError,
  NoMigrationPathError,
  CURRENT_PROJECT_VERSION,
} from "./projectFile";

describe("EditorStore project save/load round-trip", () => {
  it("a full project round-trips losslessly through save/load", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 10 });
    store.addPinLayer();
    store.addThreadLayer();
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[1].id);
    store.setBoardDimensions({ diameter: 42 });
    store.setGrid({ gapX: 2, gapY: 3, colour: "#00ff00", opacity: 0.25 });

    const file = store.toProjectFile();
    // Simulate writing to disk and reading back — must survive real JSON serialization.
    const roundTripped = JSON.parse(JSON.stringify(file));

    const loaded = new EditorStore();
    loaded.loadProject(roundTripped);

    expect(loaded.getState().board.dimensions.diameter).toBe(42);
    expect(loaded.getState().grid).toMatchObject({ gapX: 2, gapY: 3, colour: "#00ff00", opacity: 0.25 });
    expect(loaded.getState().pinLayers).toHaveLength(2);
    expect(loaded.getState().threadLayers).toHaveLength(2);
    expect(loaded.getState().pinLayers[0].pinPaths[0].pins).toEqual(pins);
    expect(loaded.getState().threadLayers[0].threadPaths[0].pinIds).toEqual([pins[0].id, pins[1].id]);
  });

  it("saved file includes the current version", () => {
    const store = new EditorStore();
    expect(store.toProjectFile().version).toBe(CURRENT_PROJECT_VERSION);
  });

  it("loading resets the undo history (undoing past a load is incoherent)", () => {
    const store = new EditorStore();
    store.setBoardDimensions({ diameter: 90 });
    expect(store.canUndo()).toBe(true);

    store.loadProject({
      board: store.getState().board,
      grid: { gapX: 1, gapY: 1, colour: "#6d5ef7", opacity: 0.6 },
      pinLayers: store.getState().pinLayers,
      threadLayers: store.getState().threadLayers,
    });

    expect(store.canUndo()).toBe(false);
  });

  it("duplicate produces an independent copy — mutating it never affects the original", () => {
    const original = new EditorStore();
    const layerId = original.getState().pinLayers[0].id;
    original.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });
    const snapshot = JSON.parse(JSON.stringify(original.toProjectFile()));

    const duplicate = new EditorStore();
    duplicate.loadProject(snapshot);
    duplicate.setBoardDimensions({ diameter: 999 });

    expect(original.getState().board.dimensions.diameter).not.toBe(999);
  });
});

describe("migrateProjectFile", () => {
  it("passes through a current-version file unchanged", () => {
    const store = new EditorStore();
    const file = store.toProjectFile();
    expect(migrateProjectFile(file)).toEqual(file);
  });

  it("rejects a file with no version field", () => {
    expect(() => migrateProjectFile({ board: {} })).toThrow(InvalidProjectFileError);
  });

  it("rejects null, and non-object raw input", () => {
    expect(() => migrateProjectFile(null)).toThrow(InvalidProjectFileError);
    expect(() => migrateProjectFile("not a project")).toThrow(InvalidProjectFileError);
    expect(() => migrateProjectFile(42)).toThrow(InvalidProjectFileError);
  });

  it("rejects a file newer than this app supports", () => {
    expect(() => migrateProjectFile({ version: 999 })).toThrow(IncompatibleProjectVersionError);
    try {
      migrateProjectFile({ version: 999 });
    } catch (e) {
      expect((e as IncompatibleProjectVersionError).foundVersion).toBe(999);
    }
  });

  it("rejects a file older than any known migration path", () => {
    expect(() => migrateProjectFile({ version: 0 })).toThrow(NoMigrationPathError);
    try {
      migrateProjectFile({ version: 0 });
    } catch (e) {
      expect((e as NoMigrationPathError).version).toBe(0);
    }
  });
});

describe("serializeProject / createEmptyProject / projectFileToDocument", () => {
  it("serializeProject stamps the current version onto a document", () => {
    const doc = createEmptyProject();
    const file = serializeProject(doc);
    expect(file.version).toBe(CURRENT_PROJECT_VERSION);
    expect(file.board).toBe(doc.board);
  });

  it("createEmptyProject produces a default board, grid, and one layer of each kind", () => {
    const doc = createEmptyProject();
    expect(doc.board.shape).toBe("circle");
    expect(doc.pinLayers).toHaveLength(1);
    expect(doc.threadLayers).toHaveLength(1);
  });

  it("projectFileToDocument strips the version field back off", () => {
    const file = serializeProject(createEmptyProject());
    const doc = projectFileToDocument(file);
    expect(doc).toEqual({ board: file.board, grid: file.grid, pinLayers: file.pinLayers, threadLayers: file.threadLayers });
    expect((doc as { version?: number }).version).toBeUndefined();
  });
});
