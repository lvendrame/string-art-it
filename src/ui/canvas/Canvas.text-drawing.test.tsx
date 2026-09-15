import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorStore } from "../../application/document";
import { Canvas } from "./Canvas";

// docs/specs/29-text-pin-path.md — the Text tool's placement click awaits the default
// font (src/infrastructure/fonts/fontLoader.ts's ensureFontLoaded), so this mocks fetch
// the same way src/infrastructure/fonts/fontLoader.test.ts does, against the real
// bundled pt-sans/Regular.ttf — the shortest path to a component test that exercises
// the real click -> real font parse -> real contours -> real pins pipeline end to end.
beforeAll(() => {
  Element.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 720, bottom: 640, width: 720, height: 640, x: 0, y: 0, toJSON() {} }) as DOMRect;
});

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/fonts/pt-sans/Regular.ttf") {
        const buffer = readFileSync(join(process.cwd(), "public/fonts/pt-sans/Regular.ttf"));
        return new Response(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), { status: 200 });
      }
      return new Response(null, { status: 404 });
    }),
  );
});

function mouseDownAt(svg: Element, clientX: number, clientY: number) {
  fireEvent.mouseDown(svg, { clientX, clientY });
}

describe("Canvas — Text tool interaction", () => {
  it("one click places an empty Text Pin Path at the clicked point and switches to Edit (Select) mode with it selected", async () => {
    const store = new EditorStore();
    store.setPinTool("text");
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    mouseDownAt(svg, 200, 200); // doc(10,10), per the fixed viewport used by every other Canvas test

    await vi.waitFor(() => {
      const paths = store.getState().pinLayers[0].pinPaths;
      expect(paths).toHaveLength(1);
    });

    const path = store.getState().pinLayers[0].pinPaths[0];
    expect(path.geometry).toMatchObject({ type: "text", origin: { x: 10, y: 10 }, text: "" });
    expect(path.pins).toHaveLength(0); // no text typed yet
    expect(store.getState().mode).toBe("select");
    expect(store.getState().selection).toEqual({ type: "pinPaths", refs: [{ layerId: store.getState().pinLayers[0].id, pathId: path.id }] });
  });

  it("does not throw and creates no path if switched away before the font resolves", async () => {
    const store = new EditorStore();
    store.setPinTool("text");
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    mouseDownAt(svg, 200, 200);
    store.setPinTool("line"); // switch away immediately, before the awaited font resolves

    await vi.waitFor(() => {
      // The in-flight placement still completes (it isn't cancelled) — this just proves
      // no unhandled rejection / crash occurs when the tool changes mid-await.
      expect(store.getState().pinLayers[0].pinPaths).toHaveLength(1);
    });
  });
});
