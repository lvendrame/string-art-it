import { renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { EditorStore } from "@application/document";
import { useKeyboardShortcuts, type KeyboardShortcutDeps } from "./useKeyboardShortcuts";
import type { FileMenuHandle } from "./toolbars/FileMenu";

function makeDeps(overrides: Partial<KeyboardShortcutDeps> = {}): KeyboardShortcutDeps {
  return {
    transport: {
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
    },
    totalFrames: 10,
    videoExport: { isExporting: false, supported: true, exportVideo: vi.fn() },
    onNewProject: vi.fn(),
    openHelp: vi.fn(),
    fileMenuRef: createRef<FileMenuHandle | null>(),
    ...overrides,
  };
}

describe("useKeyboardShortcuts — Play mode", () => {
  it("'p' steps to the previous frame", () => {
    const store = new EditorStore();
    store.setMode("play");
    const deps = makeDeps();
    renderHook(() => useKeyboardShortcuts(store, deps));

    fireEvent.keyDown(window, { key: "p" });

    expect(deps.transport.previous).toHaveBeenCalledOnce();
  });

  it("Shift+E exports video when supported", () => {
    const store = new EditorStore();
    store.setMode("play");
    const deps = makeDeps();
    renderHook(() => useKeyboardShortcuts(store, deps));

    fireEvent.keyDown(window, { key: "E", shiftKey: true });

    expect(deps.videoExport.exportVideo).toHaveBeenCalledOnce();
  });

  it("Shift+E does nothing when video export isn't supported", () => {
    const store = new EditorStore();
    store.setMode("play");
    const deps = makeDeps({ videoExport: { isExporting: false, supported: false, exportVideo: vi.fn() } });
    renderHook(() => useKeyboardShortcuts(store, deps));

    fireEvent.keyDown(window, { key: "E", shiftKey: true });

    expect(deps.videoExport.exportVideo).not.toHaveBeenCalled();
  });
});

describe("useKeyboardShortcuts — arrow pan claimed elsewhere", () => {
  it("ArrowLeft does not pan while a zigzag/parabolic two-pin draft is in progress", () => {
    const store = new EditorStore();
    store.setMode("thread");
    const [pinLayer] = store.getState().pinLayers;
    store.addPinPath(pinLayer.id, { type: "circle", center: { x: 0, y: 0 }, radius: 7 });
    const path = store.getState().pinLayers[0].pinPaths[0];
    store.setMode("thread");
    store.startTwoPinDraft("zigzag", path.pins[0].id);
    const deps = makeDeps();
    renderHook(() => useKeyboardShortcuts(store, deps));
    const before = store.getState().viewport.panOrigin;

    fireEvent.keyDown(window, { key: "ArrowLeft" });

    expect(store.getState().viewport.panOrigin).toEqual(before);
  });
});
