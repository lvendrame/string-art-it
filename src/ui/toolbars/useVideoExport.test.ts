import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { createDefaultBoard } from "@application/document";
import { useVideoExport } from "./useVideoExport";

// Same jsdom gaps as videoExport.test.ts (no MediaRecorder/captureStream/real canvas
// rasterization, and a Node-Blob-vs-jsdom-URL.createObjectURL mismatch) — mocked the
// same way so this hook's own orchestration (early-return guards, exporting/progress
// state, the drawFrame callback driving goToFrame, the final download) runs for real.
class MockRecorder {
  static isTypeSupported = () => true;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => {
    this.ondataavailable?.({ data: new Blob(["chunk"]) });
    this.onstop?.();
  });
  constructor(
    public stream: unknown,
    public opts: { mimeType: string },
  ) {}
}

class MockImage {
  onload: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  src = "";
  constructor() {
    queueMicrotask(() => this.onload?.());
  }
}

function stubEnvironment() {
  vi.stubGlobal("MediaRecorder", MockRecorder);
  vi.stubGlobal("Image", MockImage);
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  (HTMLCanvasElement.prototype as unknown as { captureStream: () => unknown }).captureStream = vi.fn().mockReturnValue({});
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
}

function svgRefWithElement() {
  const ref = createRef<SVGSVGElement>();
  (ref as { current: SVGSVGElement }).current = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  return ref;
}

describe("useVideoExport", () => {
  beforeEach(() => {
    stubEnvironment();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("supported reflects whether a video mime type is available", () => {
    const { result, unmount } = renderHook(() => useVideoExport(svgRefWithElement(), createDefaultBoard(), 5, 100, vi.fn()));
    expect(result.current.supported).toBe(true);
    unmount();

    vi.stubGlobal("MediaRecorder", undefined);
    const none = renderHook(() => useVideoExport(svgRefWithElement(), createDefaultBoard(), 5, 100, vi.fn()));
    expect(none.result.current.supported).toBe(false);
  });

  it("exportVideo is a no-op when no video mime type is supported", async () => {
    vi.stubGlobal("MediaRecorder", undefined);
    const goToFrame = vi.fn();
    const { result } = renderHook(() => useVideoExport(svgRefWithElement(), createDefaultBoard(), 5, 100, goToFrame));

    await act(() => result.current.exportVideo());

    expect(goToFrame).not.toHaveBeenCalled();
    expect(result.current.isExporting).toBe(false);
  });

  it("exportVideo is a no-op when there are no frames to export", async () => {
    const goToFrame = vi.fn();
    const { result } = renderHook(() => useVideoExport(svgRefWithElement(), createDefaultBoard(), 0, 100, goToFrame));

    await act(() => result.current.exportVideo());

    expect(goToFrame).not.toHaveBeenCalled();
  });

  it("exportVideo is a no-op when the SVG ref isn't attached yet", async () => {
    const goToFrame = vi.fn();
    const ref = createRef<SVGSVGElement>();
    const { result } = renderHook(() => useVideoExport(ref, createDefaultBoard(), 5, 100, goToFrame));

    await act(() => result.current.exportVideo());

    expect(goToFrame).not.toHaveBeenCalled();
  });

  it("drives goToFrame across every frame, reports progress, and downloads the result", async () => {
    const goToFrame = vi.fn();
    const { result } = renderHook(() => useVideoExport(svgRefWithElement(), createDefaultBoard(), 3, 1, goToFrame));

    await act(() => result.current.exportVideo());

    expect(goToFrame).toHaveBeenCalledTimes(3);
    expect(goToFrame.mock.calls.map((c) => c[0])).toEqual([1, 2, 3]);
    expect(result.current.progress).toBe(3);
    expect(result.current.isExporting).toBe(false);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
