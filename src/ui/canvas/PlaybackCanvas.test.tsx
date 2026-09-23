import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { PlaybackCanvas } from "./PlaybackCanvas";

function seedDocument() {
  const store = new EditorStore();
  const layerId = store.getState().pinLayers[0].id;
  store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 4, y: 0 } }); // 5 pins
  const pins = store.getState().pinLayers[0].pinPaths[0].pins;
  const threadLayerId = store.getState().threadLayers[0].id;
  store.extendThreadDraft(pins[0].id);
  store.extendThreadDraft(pins[1].id);
  store.extendThreadDraft(pins[2].id);
  store.finishThreadDraftWithSegment(threadLayerId, pins[3].id); // A-B-C-D, 3 segments
  return store;
}

function countPinCircles(container: HTMLElement): number {
  return container.querySelectorAll('circle[r="0.1"]').length;
}

describe("PlaybackCanvas", () => {
  it("renders all pins regardless of frame, even at frame 0", () => {
    const store = seedDocument();
    const { container } = render(<PlaybackCanvas state={store.getState()} frame={0} />);
    expect(countPinCircles(container)).toBe(5);
    expect(screen.getByRole("img", { name: "Play mode canvas" })).toBeInTheDocument();
  });

  it("renders exactly N segments' worth of thread path data at frame N", () => {
    const store = seedDocument();
    const { container: atZero } = render(<PlaybackCanvas state={store.getState()} frame={0} />);
    expect(atZero.querySelector('[data-testid="thread-path"]')).not.toBeInTheDocument();

    const { container: atTwo } = render(<PlaybackCanvas state={store.getState()} frame={2} />);
    const groupAtTwo = atTwo.querySelector('[data-testid="thread-path"]');
    expect(groupAtTwo).toBeInTheDocument();
    // 2 segments -> 3 vertices -> an "M x y L x y L x y" path.
    expect(groupAtTwo!.querySelector("path")!.getAttribute("d")?.match(/L/g)).toHaveLength(2);

    const { container: atThree } = render(<PlaybackCanvas state={store.getState()} frame={3} />);
    const groupAtThree = atThree.querySelector('[data-testid="thread-path"]');
    expect(groupAtThree!.querySelector("path")!.getAttribute("d")?.match(/L/g)).toHaveLength(3);
  });
});
