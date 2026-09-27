import { render, screen, fireEvent } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { Canvas } from "./Canvas";

beforeAll(() => {
  Element.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 720, bottom: 640, width: 720, height: 640, x: 0, y: 0, toJSON() {} }) as DOMRect;
});

// zoom 4, panOrigin (-40,-40): doc(x,y) -> screen(x*4+160, y*4+160)
function screenOf(p: { x: number; y: number }) {
  return { clientX: p.x * 4 + 160, clientY: p.y * 4 + 160 };
}

function seedRepeat() {
  const store = new EditorStore();
  const layerId = store.getState().pinLayers[0].id;
  store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 8 });
  store.setMode("thread");
  store.setThreadTool("repeat");
  const pins = store.getState().pinLayers[0].pinPaths[0].pins;
  const utils = render(<Canvas store={store} />);
  const svg = screen.getByRole("img", { name: "Board canvas" });
  const click = (...indexes: number[]) => indexes.forEach((i) => fireEvent.mouseDown(svg, screenOf(pins[i])));
  return { store, pins, svg, click, ...utils };
}

describe("Canvas — Repeat tool", () => {
  it("hovering before any click names the nearest pin", () => {
    const { pins, svg, container } = seedRepeat();
    fireEvent.mouseMove(svg, screenOf(pins[0]));
    expect(container.textContent).toContain(`Pin ${pins[0].id}`);

    fireEvent.mouseMove(svg, { clientX: 700, clientY: 600 });
    expect(container.textContent).not.toContain("click to start");
  });

  it("clicking empty canvas adds nothing; other keys are ignored", () => {
    const { store, svg, click } = seedRepeat();
    fireEvent.mouseDown(svg, { clientX: 700, clientY: 600 });
    expect(store.getState().repeatDraft).toBeNull();
    click(0);
    fireEvent.keyDown(window, { key: "x" });
    expect(store.getState().repeatDraft?.pinIds).toHaveLength(1);
  });

  it("clicks accumulate pins and preview them as a thread", () => {
    const { store, pins, click, container } = seedRepeat();
    click(0, 1, 5);
    expect(store.getState().repeatDraft?.pinIds).toEqual([pins[0].id, pins[1].id, pins[5].id]);
    expect(container.textContent).toContain("pick at least 4");
    expect(container.querySelectorAll("path, line, polyline").length).toBeGreaterThan(0);

    click(6);
    expect(container.textContent).toContain("press Enter to generate");
  });

  it("Enter generates one Thread Path from the draft", () => {
    const { store, pins, click } = seedRepeat();
    click(0, 1, 5, 6);
    fireEvent.keyDown(window, { key: "Enter" });

    const threads = store.getState().threadLayers[0].threadPaths;
    expect(threads).toHaveLength(1);
    expect(threads[0].pinIds).toEqual([pins[0].id, pins[1].id, pins[5].id, pins[6].id, pins[10].id, pins[11].id]);
    expect(store.getState().repeatDraft).toBeNull();
  });

  it("ArrowLeft removes the last pin and Escape cancels", () => {
    const { store, click } = seedRepeat();
    click(0, 1, 5);
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(store.getState().repeatDraft?.pinIds).toHaveLength(2);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(store.getState().repeatDraft).toBeNull();
  });

  it("ignores keys typed into a form field or outside the Repeat tool", () => {
    const { store, click } = seedRepeat();
    click(0, 1, 5, 6);
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(store.getState().repeatDraft?.pinIds).toHaveLength(4);
    input.remove();

    const button = document.createElement("button");
    document.body.appendChild(button);
    fireEvent.keyDown(button, { key: "Enter" });
    expect(store.getState().repeatDraft?.pinIds).toHaveLength(4);
    button.remove();

    store.setMode("pin");
    fireEvent.keyDown(window, { key: "Enter" });
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);
  });
});
