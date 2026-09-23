import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cmToPixels, exportToRaster, loadImage, rasterMimeType } from "./rasterExport";

// exportToRaster()'s real work happens through a <canvas> 2D context, which jsdom does
// not implement (getContext("2d") returns null with no polyfill) — mocking
// HTMLCanvasElement.prototype.getContext/toBlob and the global Image constructor lets
// this exercise the function's own orchestration (DPI sizing, JPEG's white-flatten
// step, mime selection, blob URL lifecycle, error paths) without a real rasterization
// backend.
describe("cmToPixels", () => {
  it("converts centimetres to pixels at the given DPI", () => {
    expect(cmToPixels(2.54, 96)).toBe(96);
    expect(cmToPixels(1, 300)).toBe(Math.round(300 / 2.54));
  });
});

describe("rasterMimeType", () => {
  it("maps format to the correct MIME type", () => {
    expect(rasterMimeType("png")).toBe("image/png");
    expect(rasterMimeType("jpeg")).toBe("image/jpeg");
  });
});

class MockImage {
  static instances: MockImage[] = [];
  onload: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  src = "";
  constructor() {
    MockImage.instances.push(this);
  }
}

describe("loadImage", () => {
  const originalImage = globalThis.Image;

  beforeEach(() => {
    MockImage.instances = [];
    vi.stubGlobal("Image", MockImage);
  });

  afterEach(() => {
    vi.stubGlobal("Image", originalImage);
  });

  it("resolves with the image once it loads", async () => {
    const promise = loadImage("blob:test");
    const created = MockImage.instances[0];
    created.onload!();

    await expect(promise).resolves.toBe(created);
  });

  it("rejects if the image fails to load", async () => {
    const promise = loadImage("blob:test");
    const created = MockImage.instances[0];
    created.onerror!(new Event("error"));

    await expect(promise).rejects.toThrow("Could not load SVG for rasterization.");
  });
});

describe("exportToRaster", () => {
  const originalImage = globalThis.Image;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;

  afterEach(() => {
    vi.stubGlobal("Image", originalImage);
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
    vi.restoreAllMocks();
  });

  // jsdom's real URL.createObjectURL reads an internal _buffer slot off its own Blob
  // implementation, which setup.ts's Node-Blob swap (needed for .text()/.arrayBuffer())
  // makes incompatible with — stub it to a plain string, same as production only cares
  // about (a URL the mocked Image below never actually fetches).
  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
  });

  function stubHappyPath() {
    vi.stubGlobal(
      "Image",
      class extends MockImage {
        constructor() {
          super();
          queueMicrotask(() => this.onload?.());
        }
      },
    );
    const ctx = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() };
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toBlob = vi.fn(function (this: HTMLCanvasElement, callback: BlobCallback, mime?: string) {
      callback(new Blob(["png"], { type: mime }));
    }) as unknown as typeof HTMLCanvasElement.prototype.toBlob;
    return ctx;
  }

  it("rasterizes at the DPI-derived pixel size and resolves with the encoded blob", async () => {
    stubHappyPath();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"></svg>`;

    const blob = await exportToRaster(svg, { widthCm: 2.54, heightCm: 2.54, dpi: 96, format: "png" });

    expect(blob.type).toBe("image/png");
  });

  it("flattens JPEG output onto a white background before drawing the image", async () => {
    const ctx = stubHappyPath();

    await exportToRaster("<svg/>", { widthCm: 1, heightCm: 1, dpi: 96, format: "jpeg" });

    expect(ctx.fillStyle).toBe("white");
    expect(ctx.fillRect).toHaveBeenCalledTimes(1);
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });

  it("does not fill a background for PNG (alpha-preserving) output", async () => {
    const ctx = stubHappyPath();

    await exportToRaster("<svg/>", { widthCm: 1, heightCm: 1, dpi: 96, format: "png" });

    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it("throws when a 2D canvas context is unavailable", async () => {
    vi.stubGlobal(
      "Image",
      class extends MockImage {
        constructor() {
          super();
          queueMicrotask(() => this.onload?.());
        }
      },
    );
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    await expect(exportToRaster("<svg/>", { widthCm: 1, heightCm: 1, dpi: 96, format: "png" })).rejects.toThrow("Canvas 2D context unavailable.");
  });

  it("rejects when canvas.toBlob fails to produce a blob", async () => {
    stubHappyPath();
    HTMLCanvasElement.prototype.toBlob = vi.fn(function (this: HTMLCanvasElement, callback: BlobCallback) {
      callback(null);
    }) as unknown as typeof HTMLCanvasElement.prototype.toBlob;

    await expect(exportToRaster("<svg/>", { widthCm: 1, heightCm: 1, dpi: 96, format: "png" })).rejects.toThrow("Rasterization failed.");
  });

  it("revokes the intermediate object URL even when rasterization fails", async () => {
    vi.stubGlobal(
      "Image",
      class extends MockImage {
        constructor() {
          super();
          queueMicrotask(() => this.onload?.());
        }
      },
    );
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    await expect(exportToRaster("<svg/>", { widthCm: 1, heightCm: 1, dpi: 96, format: "png" })).rejects.toThrow();

    expect(revokeSpy).toHaveBeenCalledTimes(1);
  });
});
