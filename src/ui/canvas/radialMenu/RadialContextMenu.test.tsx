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
});
