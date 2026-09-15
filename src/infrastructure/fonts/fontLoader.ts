import { parse, type Font } from "opentype.js";
import { resolveFontFileUrl, type FontWeight } from "./fontCatalog";

// docs/plan M22 — Text Pin Path §"Why fonts don't force async into the Command
// architecture". `opentype.load`/`loadSync` are deprecated no-ops in opentype.js 2.x
// (see node_modules/opentype.js's own console.error), so this fetches the raw bytes
// itself and calls the still-supported synchronous `parse(buffer)`.
//
// Memoized by resolved URL, so a Font/Weight/Italic switch only pays the network+parse
// cost once per session — every UI caller `await`s this directly and then works with
// the Font object it hands back (see SelectionPanel.tsx / PinToolbar.tsx's Text-tool
// handling); nothing downstream needs a separate synchronous cache lookup, since typing
// in the Text field doesn't call this again — only changing Font/Weight/Italic does.
const fontByUrl = new Map<string, Promise<Font>>();

export function ensureFontLoaded(fontId: string, weight: FontWeight, italic: boolean): Promise<Font> {
  const url = resolveFontFileUrl(fontId, weight, italic);
  let pending = fontByUrl.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load font file ${url}: HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buffer) => parse(buffer));
    fontByUrl.set(url, pending);
    // Don't cache a failed load — a transient network error shouldn't permanently wedge
    // this font/weight/italic combination for the rest of the session.
    pending.catch(() => fontByUrl.delete(url));
  }
  return pending;
}
