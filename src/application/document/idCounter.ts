// Sequential, human-readable ids (`pin-42`, not a UUID). Two separate ways a freshly
// generated id could collide with one already in use, both fixed here:
//
// 1. Vite HMR re-executes a module's top-level code on every hot update to that file,
//    which would reset a plain `let counter = 0` back to 0. Storing the counter on
//    globalThis survives that re-execution, since globalThis itself is never torn down
//    by HMR — only the module's own top-level bindings are.
// 2. Loading a document from outside the current session (Open, autosave restore) can
//    bring in ids minted by a counter that had already advanced further than this
//    session's fresh one — a brand new page load starts every counter back at 0
//    regardless of globalThis. `seedCounterFrom` (called by EditorStore.loadProject for
//    every id in the loaded document) bumps the relevant counter past whatever's
//    already in the file, so newly created objects can never reuse one of its ids.
const counters = ((globalThis as Record<string, unknown>).__stringArtItIdCounters ??= {}) as Record<string, number>;

export function nextId(prefix: string): string {
  counters[prefix] = (counters[prefix] ?? 0) + 1;
  return `${prefix}-${counters[prefix]}`;
}

export function seedCounterFrom(id: string): void {
  const match = /^(.+)-(\d+)$/.exec(id);
  if (!match) return;
  const [, prefix, numStr] = match;
  const num = Number(numStr);
  if (num > (counters[prefix] ?? 0)) counters[prefix] = num;
}
