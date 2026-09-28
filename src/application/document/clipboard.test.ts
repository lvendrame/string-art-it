import { describe, expect, it } from "vitest";
import { createDefaultBoard } from "./board";
import {
  CLIPBOARD_KIND,
  PASTE_OFFSET,
  collectFromPinPaths,
  collectFromThread,
  createClipboardPayload,
  instantiateClipboard,
  parseClipboard,
  pasteDelta,
  serializeClipboard,
} from "./clipboard";
import { createPinLayer, type PinLayer } from "./pinLayer";
import { createPinPath, type PinPath } from "./pinPath";
import { mirroredPinId } from "./symmetryConfig";
import { createThreadLayer, type ThreadLayer } from "./threadLayer";
import { createThreadPath } from "./threadPath";

const STYLE = { colour: "#fff", diameter: 2, guideVisible: true };

function line(y: number): PinPath {
  return createPinPath({ type: "line", start: { x: 0, y }, end: { x: 10, y } }, 5, STYLE);
}

function fixture() {
  const a = line(0);
  const b = line(5);
  const c = line(10);
  const pinLayers: PinLayer[] = [{ ...createPinLayer("P1"), pinPaths: [a, b] }, { ...createPinLayer("P2"), pinPaths: [c] }];
  const crossAB = createThreadPath([a.pins[0].id, b.pins[0].id], ["#f00"], 1);
  const onlyC = createThreadPath([c.pins[0].id, c.pins[1].id], ["#0f0"], 1);
  const threadLayers: ThreadLayer[] = [{ ...createThreadLayer("T1"), threadPaths: [crossAB] }, { ...createThreadLayer("T2"), threadPaths: [onlyC] }];
  return { a, b, c, pinLayers, threadLayers, crossAB, onlyC };
}

describe("clipboard — collect", () => {
  it("copying a Pin Path takes every thread touching it and pulls in the other paths those threads reach", () => {
    const { a, b, pinLayers, threadLayers, crossAB } = fixture();
    const content = collectFromPinPaths(pinLayers, threadLayers, [a]);
    expect(content.pinPaths.map((p) => p.id)).toEqual([a.id, b.id]);
    expect(content.threadPaths.map((t) => t.id)).toEqual([crossAB.id]);
  });

  it("copying a Pin Path with no threads copies only that path", () => {
    const { c, pinLayers, threadLayers, onlyC } = fixture();
    const content = collectFromPinPaths(pinLayers, threadLayers, [c]);
    expect(content.pinPaths.map((p) => p.id)).toEqual([c.id]);
    expect(content.threadPaths.map((t) => t.id)).toEqual([onlyC.id]);
  });

  it("copying a thread takes every Pin Path its pins belong to, across pin layers", () => {
    const { a, c, pinLayers } = fixture();
    const thread = createThreadPath([a.pins[1].id, c.pins[0].id], ["#00f"], 1);
    const content = collectFromThread(pinLayers, thread);
    expect(content.pinPaths.map((p) => p.id)).toEqual([a.id, c.id]);
    expect(content.threadPaths).toEqual([thread]);
  });

  it("a thread ending on a mirrored pin pulls in the mirrored pin's source path", () => {
    const a = { ...line(0), symmetry: { type: "horizontal" as const, axis: { x: 0, y: 20 } } };
    const pinLayers = [{ ...createPinLayer("P"), pinPaths: [a] }];
    const thread = createThreadPath([a.pins[0].id, mirroredPinId(a.pins[1].id, 0)], ["#00f"], 1);
    expect(collectFromThread(pinLayers, thread).pinPaths.map((p) => p.id)).toEqual([a.id]);
  });
});

describe("clipboard — parse", () => {
  it("round-trips a serialized payload", () => {
    const { a, pinLayers, threadLayers } = fixture();
    const payload = createClipboardPayload(collectFromPinPaths(pinLayers, threadLayers, [a]), "board-1");
    expect(parseClipboard(serializeClipboard(payload))).toEqual(payload);
  });

  it.each([
    ["plain text", "hello"],
    ["foreign JSON", JSON.stringify({ foo: 1 })],
    ["wrong kind", JSON.stringify({ kind: "other", version: 1, copyId: "x", sourceBoardId: "b", pinPaths: [], threadPaths: [] })],
  ])("rejects %s", (_, text) => {
    expect(parseClipboard(text)).toBeNull();
  });

  it("rejects a newer envelope version", () => {
    const { a, pinLayers, threadLayers } = fixture();
    const payload = { ...createClipboardPayload(collectFromPinPaths(pinLayers, threadLayers, [a]), "b"), version: 99 };
    expect(parseClipboard(JSON.stringify(payload))).toBeNull();
  });

  it("rejects a thread referencing a pin missing from the payload", () => {
    const { a } = fixture();
    const payload = createClipboardPayload({ pinPaths: [a], threadPaths: [createThreadPath([a.pins[0].id, "pin-missing"], ["#f00"], 1)] }, "b");
    expect(parseClipboard(serializeClipboard(payload))).toBeNull();
  });

  it("uses the app-specific kind marker", () => {
    expect(createClipboardPayload({ pinPaths: [line(0)], threadPaths: [] }, "b").kind).toBe(CLIPBOARD_KIND);
  });
});

describe("clipboard — instantiate", () => {
  it("mints fresh path/pin/thread ids and rewires threads to the new pins", () => {
    const { a, b, crossAB } = fixture();
    const pasted = instantiateClipboard({ pinPaths: [a, b], threadPaths: [crossAB] }, { x: 0, y: 0 });
    const [pa, pb] = pasted.pinPaths;
    expect(pa.id).not.toBe(a.id);
    expect(pa.pins.map((p) => p.id)).not.toContain(a.pins[0].id);
    expect(pasted.threadPaths[0].id).not.toBe(crossAB.id);
    expect(pasted.threadPaths[0].pinIds).toEqual([pa.pins[0].id, pb.pins[0].id]);
  });

  it("translates geometry, pins, and symmetry by the delta", () => {
    const a = { ...line(0), symmetry: { type: "radial" as const, centre: { x: 1, y: 1 }, intervalDegrees: 90 } };
    const [pasted] = instantiateClipboard({ pinPaths: [a], threadPaths: [] }, { x: 2, y: 3 }).pinPaths;
    expect(pasted.geometry).toEqual({ type: "line", start: { x: 2, y: 3 }, end: { x: 12, y: 3 } });
    expect(pasted.pins[0]).toMatchObject({ x: a.pins[0].x + 2, y: a.pins[0].y + 3 });
    expect(pasted.symmetry).toEqual({ type: "radial", centre: { x: 3, y: 4 }, intervalDegrees: 90 });
  });

  it("remaps thread endpoints on mirrored pins to the pasted path's mirrored pins", () => {
    const a = { ...line(0), symmetry: { type: "vertical" as const, axis: { x: 20, y: 0 } } };
    const thread = createThreadPath([a.pins[0].id, mirroredPinId(a.pins[0].id, 0)], ["#f00"], 1);
    const pasted = instantiateClipboard({ pinPaths: [a], threadPaths: [thread] }, { x: 0, y: 0 });
    const newPinId = pasted.pinPaths[0].pins[0].id;
    expect(pasted.threadPaths[0].pinIds).toEqual([newPinId, mirroredPinId(newPinId, 0)]);
  });
});

describe("clipboard — placement", () => {
  const board = createDefaultBoard(); // circle, diameter 60 → bbox ±30
  const content = { pinPaths: [line(0)], threadPaths: [] };

  it("same board: every paste cascades one more offset step", () => {
    expect(pasteDelta(content, board, 1, true)).toEqual({ x: PASTE_OFFSET, y: PASTE_OFFSET });
    expect(pasteDelta(content, board, 2, true)).toEqual({ x: 2 * PASTE_OFFSET, y: 2 * PASTE_OFFSET });
  });

  it("other board: first paste keeps original coordinates, then cascades", () => {
    expect(pasteDelta(content, board, 1, false)).toEqual({ x: 0, y: 0 });
    expect(pasteDelta(content, board, 2, false)).toEqual({ x: PASTE_OFFSET, y: PASTE_OFFSET });
  });

  it("content that would land outside the target board is re-centred on it", () => {
    const far = { pinPaths: [createPinPath({ type: "line", start: { x: 100, y: 100 }, end: { x: 110, y: 100 } }, 5, STYLE)], threadPaths: [] };
    const delta = pasteDelta(far, board, 1, false);
    expect(delta.x).toBeCloseTo(-105);
    expect(delta.y).toBeCloseTo(-100);
  });
});
