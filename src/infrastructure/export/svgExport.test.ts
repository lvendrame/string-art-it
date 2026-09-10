import { describe, expect, it } from "vitest";
import { EditorStore } from "../../application/document";
import { buildExportSvg } from "./svgExport";

const ALL_ELEMENTS = { boardOutline: true, background: true, pins: true, pinGuides: true, pinNumbers: true, threads: true, grid: true };
const NONE_ELEMENTS = { boardOutline: false, background: false, pins: false, pinGuides: false, pinNumbers: false, threads: false, grid: false };

describe("buildExportSvg", () => {
  it("produces a well-formed standalone SVG document at true physical size", () => {
    const store = new EditorStore();
    const svg = buildExportSvg(store.getState(), ALL_ELEMENTS);

    expect(svg).toContain("<?xml");
    expect(svg).toContain("<svg xmlns=");
    expect(svg).toMatch(/width="[\d.]+cm"/);
    expect(svg).toMatch(/height="[\d.]+cm"/);
    expect(svg).toContain("</svg>");
  });

  it("board outline is a true vector path, not a rasterized image", () => {
    const store = new EditorStore();
    const svg = buildExportSvg(store.getState(), ALL_ELEMENTS);
    expect(svg).toMatch(/<path d="M[^"]+" fill=/);
    expect(svg).not.toContain("<image");
  });

  it("respects element selection — pins only", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });

    const svg = buildExportSvg(store.getState(), { ...NONE_ELEMENTS, pins: true });

    expect(svg).toContain("<circle");
    expect(svg).not.toMatch(/<path d="M[^"]+" fill="black|url/); // no board outline/guides
  });

  it("hidden layers are excluded from export", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });
    store.togglePinLayerVisible(layerId);

    const svg = buildExportSvg(store.getState(), ALL_ELEMENTS);
    expect(svg).not.toContain("<circle");
  });

  it("thread geometry renders as a vector path referencing real pin coordinates", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[pins.length - 1].id);

    const svg = buildExportSvg(store.getState(), { ...NONE_ELEMENTS, threads: true });

    expect(svg).toContain(`M ${pins[0].x} ${pins[0].y}`);
  });
});
