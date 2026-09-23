import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorStore, type EditorState } from "@application/document";
import type { PlaybackTransport } from "@ui/toolbars/usePlaybackTransport";
import { RadialContextMenu } from "./RadialContextMenu";

function fakeTransport(overrides: Partial<PlaybackTransport> = {}): PlaybackTransport {
  return {
    frame: 0,
    isPlaying: false,
    intervalMs: 150,
    setIntervalMs: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    goToFrame: vi.fn(),
    first: vi.fn(),
    previous: vi.fn(),
    next: vi.fn(),
    last: vi.fn(),
    ...overrides,
  };
}

function renderMenu(overrides: Partial<EditorState> = {}, transportOverrides: Partial<PlaybackTransport> = {}) {
  const store = new EditorStore(overrides);
  const state = store.getState();
  const transport = fakeTransport(transportOverrides);
  const onClose = vi.fn();
  const utils = render(
    <RadialContextMenu
      store={store}
      state={state}
      transport={transport}
      position={{ x: 100, y: 100, anchorPoint: { x: 100, y: 100 } }}
      onClose={onClose}
    />,
  );
  return { store, transport, onClose, ...utils };
}

function tooltipContents(container: HTMLElement): (string | null)[] {
  return Array.from(container.querySelectorAll("[data-tooltip-content]")).map((el) => el.getAttribute("data-tooltip-content"));
}

describe("RadialContextMenu", () => {
  it("renders the Edit-mode base slice set with no Merge slice absent a mergeable selection", () => {
    const { container } = renderMenu({ mode: "select", selectTool: "select", selection: { type: "none" } });
    expect(tooltipContents(container)).toEqual(["Select", "Move", "Rotation", "Scale"]);
  });

  it("renders the Merge slice once 2+ Pin Paths are selected, and clicking it fires commitSelectionMerge", () => {
    const { store, container, onClose } = renderMenu({
      mode: "select",
      selection: { type: "pinPaths", refs: [{ layerId: "l1", pathId: "p1" }, { layerId: "l1", pathId: "p2" }] },
    });
    expect(tooltipContents(container)).toEqual(["Select", "Move", "Rotation", "Scale", "Merge"]);

    const spy = vi.spyOn(store, "commitSelectionMerge");
    fireEvent.click(container.querySelector('[data-tooltip-content="Merge"]')!);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking a Pin-mode slice sets the matching Pin tool and closes", () => {
    const { store, container, onClose } = renderMenu({ mode: "pin" });
    const spy = vi.spyOn(store, "setPinTool");
    fireEvent.click(container.querySelector('[data-tooltip-content="Line"]')!);
    expect(spy).toHaveBeenCalledWith("line");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("swaps to Cut/Back/Next while a thread draft is in progress", () => {
    const { container } = renderMenu({ mode: "thread", threadDraft: { pinIds: ["1", "2"] } });
    expect(tooltipContents(container)).toEqual(["Cut", "Back", "Next"]);
  });

  it("Cut finishes the draft on the active thread layer", () => {
    const { store, container } = renderMenu({ mode: "thread", threadDraft: { pinIds: ["1", "2"] } });
    const spy = vi.spyOn(store, "finishThreadDraft");
    fireEvent.click(container.querySelector('[data-tooltip-content="Cut"]')!);
    expect(spy).toHaveBeenCalledWith(store.getState().activeThreadLayerId);
  });

  it("renders the Play-mode transport slices and toggles Play/Pause icon by isPlaying", () => {
    const playing = renderMenu({ mode: "play" }, { isPlaying: true });
    expect(tooltipContents(playing.container)).toEqual(["First frame", "Previous frame", "Pause", "Next frame", "Last frame"]);

    const paused = renderMenu({ mode: "play" }, { isPlaying: false });
    expect(tooltipContents(paused.container)).toEqual(["First frame", "Previous frame", "Play", "Next frame", "Last frame"]);
  });

  it("Escape closes without firing an action", () => {
    const { store, onClose } = renderMenu({ mode: "pan" });
    const spy = vi.spyOn(store, "setViewport");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("clicking outside the menu closes without firing an action", () => {
    const { store, container, onClose } = renderMenu({ mode: "pan" });
    const spy = vi.spyOn(store, "setViewport");
    fireEvent.click(container.querySelector('[data-testid="radial-menu-backdrop"]')!);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(spy).not.toHaveBeenCalled();
  });

  function clickSlice(container: HTMLElement, tooltip: string) {
    fireEvent.click(container.querySelector(`[data-tooltip-content="${tooltip}"]`)!);
  }

  it("Move/Rotation/Scale slices set the matching Select tool", () => {
    const { store, container } = renderMenu({ mode: "select" });
    const spy = vi.spyOn(store, "setSelectTool");

    clickSlice(container, "Move");
    expect(spy).toHaveBeenCalledWith("move");
    clickSlice(container, "Rotation");
    expect(spy).toHaveBeenCalledWith("rotate");
    clickSlice(container, "Scale");
    expect(spy).toHaveBeenCalledWith("scale");
  });

  it("every basic Pin-mode slice sets its matching Pin tool", () => {
    const { store, container } = renderMenu({ mode: "pin" });
    const spy = vi.spyOn(store, "setPinTool");
    const cases: [string, string][] = [
      ["Arc", "arc"],
      ["Ellipse", "ellipse"],
      ["Circle", "circle"],
      ["Rect", "rectangle"],
      ["Square", "square"],
      ["Freehand", "freehand"],
      ["Path", "polygon"],
      ["Eraser", "eraser"],
      ["Path Eraser", "path-eraser"],
    ];
    for (const [tooltip, tool] of cases) {
      clickSlice(container, tooltip);
      expect(spy).toHaveBeenCalledWith(tool);
    }
  });

  it("Pin-mode Path-tool draft slices: Cut/Back/Cancel", () => {
    const { store, container } = renderMenu({ mode: "pin", polygonDraft: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }] } });
    expect(tooltipContents(container)).toEqual(["Cut", "Back", "Cancel"]);

    const finish = vi.spyOn(store, "finishPolygonDraft");
    clickSlice(container, "Cut");
    expect(finish).toHaveBeenCalledWith(store.getState().activePinLayerId);
  });

  it("Pin-mode Path-tool draft Back/Cancel fire retract/cancel", () => {
    const { store, container } = renderMenu({ mode: "pin", polygonDraft: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] } });
    const retract = vi.spyOn(store, "retractPolygonDraft");
    clickSlice(container, "Back");
    expect(retract).toHaveBeenCalledTimes(1);

    const cancel = vi.spyOn(store, "cancelPolygonDraft");
    clickSlice(container, "Cancel");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("every basic Thread-mode slice sets its matching Thread tool", () => {
    const { store, container } = renderMenu({ mode: "thread" });
    const spy = vi.spyOn(store, "setThreadTool");
    const cases: [string, string][] = [
      ["Draw", "draw"],
      ["Zig-zag", "zigzag"],
      ["Parabolic", "parabolic"],
      ["Eraser", "eraser"],
      ["Segment", "segment-eraser"],
    ];
    for (const [tooltip, tool] of cases) {
      clickSlice(container, tooltip);
      expect(spy).toHaveBeenCalledWith(tool);
    }
  });

  it("Thread-draft Back/Next fire retract/advance-by-pattern", () => {
    const { store, container } = renderMenu({ mode: "thread", threadDraft: { pinIds: ["1", "2"] } });
    const retract = vi.spyOn(store, "retractThreadDraft");
    clickSlice(container, "Back");
    expect(retract).toHaveBeenCalledTimes(1);

    const advance = vi.spyOn(store, "advanceThreadDraftByPattern");
    clickSlice(container, "Next");
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it("two-pin draft with candidates shows Cut/Back/Cancel, each firing the matching store method", () => {
    const { store, container } = renderMenu({
      mode: "thread",
      twoPinDraft: { tool: "zigzag", firstPinId: "p1", candidates: [["p1", "p2"]], chosenIndex: 0 },
    });
    expect(tooltipContents(container)).toEqual(["Cut", "Back", "Cancel"]);

    const resolve = vi.spyOn(store, "resolveTwoPinDraft");
    clickSlice(container, "Cut");
    expect(resolve).toHaveBeenCalledWith(store.getState().activeThreadLayerId);

    const retract = vi.spyOn(store, "retractTwoPinDraft");
    clickSlice(container, "Back");
    expect(retract).toHaveBeenCalledTimes(1);

    const cancel = vi.spyOn(store, "cancelTwoPinDraft");
    clickSlice(container, "Cancel");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("two-pin draft with no candidates yet shows only Back/Cancel (no Cut)", () => {
    const { container } = renderMenu({
      mode: "thread",
      twoPinDraft: { tool: "zigzag", firstPinId: "p1", candidates: [], chosenIndex: 0 },
    });
    expect(tooltipContents(container)).toEqual(["Back", "Cancel"]);
  });

  it("Pan-mode slices Fit/Zoom in/Zoom out change the viewport", () => {
    const { store, container } = renderMenu({ mode: "pan" });
    const spy = vi.spyOn(store, "setViewport");

    clickSlice(container, "Fit");
    expect(spy).toHaveBeenCalledTimes(1);
    clickSlice(container, "Zoom in");
    expect(spy).toHaveBeenCalledTimes(2);
    clickSlice(container, "Zoom out");
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("Play-mode transport slices call the matching transport method", () => {
    const { container, transport } = renderMenu({ mode: "play" }, { isPlaying: false });

    clickSlice(container, "First frame");
    expect(transport.first).toHaveBeenCalledTimes(1);
    clickSlice(container, "Previous frame");
    expect(transport.previous).toHaveBeenCalledTimes(1);
    clickSlice(container, "Play");
    expect(transport.play).toHaveBeenCalledTimes(1);
    clickSlice(container, "Next frame");
    expect(transport.next).toHaveBeenCalledTimes(1);
    clickSlice(container, "Last frame");
    expect(transport.last).toHaveBeenCalledTimes(1);
  });

  it("Play-mode Pause slice calls transport.pause while playing", () => {
    const { container, transport } = renderMenu({ mode: "play" }, { isPlaying: true });
    clickSlice(container, "Pause");
    expect(transport.pause).toHaveBeenCalledTimes(1);
  });

});
