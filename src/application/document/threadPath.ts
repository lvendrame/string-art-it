import { nextId } from "./idCounter";

// docs/specs/30-thread-path-model / 12-thread-editor.md. `twistPitch` is the Phase 2
// "configurable spiral pitch" (docs/specs §00) — a unitless multiplier of strand width
// controlling how tightly a 2/3-colour thread's strands twist; higher = looser spiral.
export interface ThreadPath {
  id: string;
  colours: string[];
  width: number;
  pinIds: string[];
  twistPitch: number;
}

function nextThreadId(): string {
  return nextId("threadpath");
}

export const DEFAULT_TWIST_PITCH = 6;

export function createThreadPath(pinIds: string[], colours: string[], width: number, twistPitch = DEFAULT_TWIST_PITCH): ThreadPath {
  return { id: nextThreadId(), colours, width, pinIds, twistPitch };
}

// docs/specs/11-erasers.md: removing a pin removes every segment touching it. An
// interior removal can split one Thread Path into two independent fragments; any
// fragment left with fewer than 2 pins is dropped entirely (a path needs >=2 pins to
// represent a segment).
export function removePinFromThreadPath(path: ThreadPath, pinId: string): ThreadPath[] {
  if (!path.pinIds.includes(pinId)) return [path];

  const fragments: ThreadPath[] = [];
  let current: string[] = [];
  for (const id of path.pinIds) {
    if (id === pinId) {
      if (current.length >= 2) fragments.push({ ...path, id: nextThreadId(), pinIds: current });
      current = [];
    } else {
      current.push(id);
    }
  }
  if (current.length >= 2) fragments.push({ ...path, id: nextThreadId(), pinIds: current });
  return fragments;
}
