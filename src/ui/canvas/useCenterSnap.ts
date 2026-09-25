import { useState } from "react";
import { BOARD_CENTER } from "@application/document";
import type { Point } from "@domain/paths";
import { useCenterSnapModifier } from "./useCenterSnapModifier";

export type CenterSnapScope = "gesture" | "lastClick";

// docs/specs/05-canvas-and-viewport.md §Snapping Priority — Ctrl/Cmd snaps to the board
// centre, but once a click has used it the modifier is ignored so the rest of the shape
// can be placed without releasing the key: for the whole gesture ("gesture"), or only
// for the next click ("lastClick", the Path tool's per-vertex rule).
export function useCenterSnap(enabled: boolean, gestureInProgress: boolean) {
  const held = useCenterSnapModifier();
  const [used, setUsed] = useState(false);
  const suppressed = used && gestureInProgress;
  const centerSnap: Point | null = enabled && held && !suppressed ? BOARD_CENTER : null;

  function registerClick(scope: CenterSnapScope): void {
    const snappedThisClick = centerSnap !== null;
    setUsed(scope === "lastClick" ? snappedThisClick : snappedThisClick || suppressed);
  }

  return { centerSnap, registerClick };
}
