import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { drawSvgElementToCanvas, pickSupportedVideoMimeType, recordFramesToVideo } from "./videoExport";

describe("pickSupportedVideoMimeType", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when MediaRecorder doesn't exist", () => {
    vi.stubGlobal("MediaRecorder", undefined);
    expect(pickSupportedVideoMimeType()).toBeNull();
  });

  it("returns null when no candidate mime type is supported", () => {
    vi.stubGlobal("MediaRecorder", { isTypeSupported: () => false });
    expect(pickSupportedVideoMimeType()).toBeNull();
  });

  it("picks the first supported candidate, preferring vp9 over vp8 over plain webm", () => {
    vi.stubGlobal("MediaRecorder", { isTypeSupported: (m: string) => m === "video/webm;codecs=vp8" || m === "video/webm" });
    expect(pickSupportedVideoMimeType()).toBe("video/webm;codecs=vp8");
  });

  it("falls back to plain webm if only that is supported", () => {
    vi.stubGlobal("MediaRecorder", { isTypeSupported: (m: string) => m === "video/webm" });
    expect(pickSupportedVideoMimeType()).toBe("video/webm");
  });
});

// jsdom implements neither a real <canvas> 2D rasterization backend, MediaRecorder, nor
// captureStream() — mocking all three (plus the global Image constructor and
// URL.createObjectURL, same jsdom/Node-Blob mismatch as rasterExport.test.ts) lets these
// exercise recordFramesToVideo/drawSvgElementToCanvas's own orchestration for real.
describe("recordFramesToVideo", () => {
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

  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalCaptureStream = (HTMLCanvasElement.prototype as unknown as { captureStream?: unknown }).captureStream;
  const originalMediaRecorder = globalThis.MediaRecorder;

  function stubCanvas() {
    const ctx = { clearRect: vi.fn(), drawImage: vi.fn() };
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as unknown as { captureStream: () => unknown }).captureStream = vi.fn().mockReturnValue({});
    return ctx;
  }

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    (HTMLCanvasElement.prototype as unknown as { captureStream?: unknown }).captureStream = originalCaptureStream;
    vi.stubGlobal("MediaRecorder", originalMediaRecorder);
    vi.restoreAllMocks();
  });

  it("draws each frame in order, reports progress, and returns the recorded blob", async () => {
    stubCanvas();
    vi.stubGlobal("MediaRecorder", MockRecorder);
    const drawFrame = vi.fn().mockResolvedValue(undefined);
    const onProgress = vi.fn();

    const blob = await recordFramesToVideo({
      widthPx: 10,
      heightPx: 10,
      fps: 30,
      mimeType: "video/webm",
      totalFrames: 3,
      intervalMs: 1,
      drawFrame,
      onProgress,
    });

    expect(drawFrame).toHaveBeenCalledTimes(3);
    expect(drawFrame.mock.calls.map((c) => c[0])).toEqual([1, 2, 3]);
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(blob.type).toBe("video/webm");
  });

  it("ignores an empty data chunk", async () => {
    stubCanvas();
    class EmptyChunkRecorder extends MockRecorder {
      stop = vi.fn(() => {
        this.ondataavailable?.({ data: new Blob([]) });
        this.onstop?.();
      });
    }
    vi.stubGlobal("MediaRecorder", EmptyChunkRecorder);

    const blob = await recordFramesToVideo({
      widthPx: 10,
      heightPx: 10,
      fps: 30,
      mimeType: "video/webm",
      totalFrames: 1,
      intervalMs: 1,
      drawFrame: vi.fn().mockResolvedValue(undefined),
    });

    expect(blob.size).toBe(0);
  });

  it("works with no onProgress callback given", async () => {
    stubCanvas();
    vi.stubGlobal("MediaRecorder", MockRecorder);

    const blob = await recordFramesToVideo({
      widthPx: 10,
      heightPx: 10,
      fps: 30,
      mimeType: "video/webm",
      totalFrames: 1,
      intervalMs: 1,
      drawFrame: vi.fn().mockResolvedValue(undefined),
    });

    expect(blob).toBeInstanceOf(Blob);
  });

  it("throws when a 2D canvas context is unavailable", async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    await expect(
      recordFramesToVideo({
        widthPx: 10,
        heightPx: 10,
        fps: 30,
        mimeType: "video/webm",
        totalFrames: 1,
        intervalMs: 1,
        drawFrame: vi.fn(),
      }),
    ).rejects.toThrow("Canvas 2D context unavailable.");
  });
});

describe("drawSvgElementToCanvas", () => {
  class MockImage {
    onload: (() => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    src = "";
    constructor() {
      queueMicrotask(() => this.onload?.());
    }
  }
  const originalImage = globalThis.Image;

  beforeEach(() => {
    vi.stubGlobal("Image", MockImage);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.stubGlobal("Image", originalImage);
    vi.restoreAllMocks();
  });

  it("serializes the SVG element, draws it onto the context, and revokes the object URL", async () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const ctx = { clearRect: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;

    await drawSvgElementToCanvas(svg, ctx, 100, 80);

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 100, 80);
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
