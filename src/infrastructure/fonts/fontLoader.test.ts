import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ensureFontLoaded as EnsureFontLoaded } from "./fontLoader";

function fontArrayBuffer(path: string): ArrayBuffer {
  const buffer = readFileSync(join(process.cwd(), path));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

describe("ensureFontLoaded", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let ensureFontLoaded: typeof EnsureFontLoaded;

  beforeEach(async () => {
    // The module keeps an internal by-URL cache (deliberately — see fontLoader.ts's own
    // doc comment on why). Resetting modules + re-importing per test gives each test a
    // fresh cache instead of leaking state across tests in this file.
    vi.resetModules();
    ({ ensureFontLoaded } = await import("./fontLoader"));
    fetchMock = vi.fn(async (url: string) => {
      if (url === "/fonts/pt-sans/Regular.ttf") {
        return new Response(fontArrayBuffer("public/fonts/pt-sans/Regular.ttf"), { status: 200 });
      }
      if (url === "/fonts/pt-sans/Bold.ttf") {
        return new Response(fontArrayBuffer("public/fonts/pt-sans/Bold.ttf"), { status: 200 });
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches and parses the resolved font file into a usable Font", async () => {
    const font = await ensureFontLoaded("pt-sans", "regular", false);
    expect(font.unitsPerEm).toBeGreaterThan(0);
    expect(typeof font.getPath).toBe("function");
  });

  it("caches by resolved (fontId, weight, italic) — a repeat call does not re-fetch", async () => {
    await ensureFontLoaded("pt-sans", "regular", false);
    await ensureFontLoaded("pt-sans", "regular", false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("a different weight resolves to a different file and triggers its own fetch", async () => {
    await ensureFontLoaded("pt-sans", "regular", false);
    await ensureFontLoaded("pt-sans", "bold", false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("an unknown font id throws synchronously (resolveFontFileUrl's guard) before any fetch", () => {
    expect(() => ensureFontLoaded("unknown-font-id", "regular", false)).toThrow(/Unknown font id/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("an HTTP error response rejects and does not poison the cache", async () => {
    fetchMock.mockImplementationOnce(async () => new Response(null, { status: 404 }));
    await expect(ensureFontLoaded("pt-sans", "regular", false)).rejects.toThrow(/HTTP 404/);
    // Retry succeeds once the mock serves a real file again.
    const font = await ensureFontLoaded("pt-sans", "regular", false);
    expect(font.unitsPerEm).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
