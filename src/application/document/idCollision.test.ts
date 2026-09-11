import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";
import type { SerializableDocument } from "./projectFile";

// Regression: a project file saved in an earlier session can carry ids minted by a
// counter that had already advanced further than a freshly loaded page's counter,
// which starts back at 0. Loading such a file and then creating something new must
// never reuse one of the file's own ids (docs/specs/16-persistence.md).
function oldSaveWithHighIds(): SerializableDocument {
  const store = new EditorStore();
  const doc = store.toProjectFile();
  return {
    ...doc,
    pinLayers: [{ id: "pinlayer-9000", name: "Pin Layer 1", visible: true, locked: false, pinPaths: [] }],
    threadLayers: [{ id: "threadlayer-9000", name: "Thread Layer 1", visible: true, locked: false, threadPaths: [] }],
  };
}

describe("id generation survives loading an old save file", () => {
  it("a new pin layer created after loading an old save never reuses one of its ids", () => {
    const store = new EditorStore();
    store.loadProject(oldSaveWithHighIds());

    store.addPinLayer();
    const ids = store.getState().pinLayers.map((l) => l.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("pinlayer-9000");
  });

  it("a new thread layer created after loading an old save never reuses one of its ids", () => {
    const store = new EditorStore();
    store.loadProject(oldSaveWithHighIds());

    store.addThreadLayer();
    const ids = store.getState().threadLayers.map((l) => l.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("threadlayer-9000");
  });

  it("a new pin path created after loading an old save with high-numbered pins never collides", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const doc: SerializableDocument = {
      ...store.toProjectFile(),
      pinLayers: [
        {
          id: layerId,
          name: "Pin Layer 1",
          visible: true,
          locked: false,
          pinPaths: [
            {
              id: "pinpath-9000",
              geometry: { type: "circle", center: { x: 0, y: 0 }, radius: 5 },
              requestedSpacing: 1,
              actualSpacing: 1,
              pins: [{ id: "pin-9000", x: 5, y: 0 }],
              guideVisible: true,
              colour: "#fff",
              diameter: 2,
              symmetry: { type: "none" },
            },
          ],
        },
      ],
    };
    store.loadProject(doc);

    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } });
    const allPinIds = store.getState().pinLayers[0].pinPaths.flatMap((p) => p.pins.map((pin) => pin.id));

    expect(new Set(allPinIds).size).toBe(allPinIds.length);
    expect(allPinIds).toContain("pin-9000");
  });
});
