import { afterEach, describe, expect, it, vi } from "vitest";
import { pickSupportedVideoMimeType } from "./videoExport";

// recordFramesToVideo()/drawSvgElementToCanvas() themselves drive a real <canvas> 2D
// context, MediaRecorder, and captureStream(), none of which jsdom implements (no
// rasterization backend, no MediaRecorder/captureStream at all) — untestable in this
// harness, same class of limitation as pdfExport.ts/rasterExport.ts's actual
// rasterization. pickSupportedVideoMimeType's candidate-selection logic is the pure,
// testable part of the contract.
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
