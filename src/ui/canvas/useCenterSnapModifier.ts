import { useEffect, useState } from "react";

// docs/specs/05-canvas-and-viewport.md §Snapping Priority — Ctrl, or Cmd (macOS
// Ctrl+click fires a context menu), held snaps the Pin-mode cursor to the board centre.
const CENTER_SNAP_KEYS = ["Control", "Meta"];

export function useCenterSnapModifier() {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (CENTER_SNAP_KEYS.includes(e.key)) setHeld(true); };
    const onKeyUp = (e: KeyboardEvent) => { if (CENTER_SNAP_KEYS.includes(e.key)) setHeld(false); };
    // A keyup lost to another window (e.g. Cmd+Tab) would otherwise leave it stuck on.
    const onBlur = () => setHeld(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return held;
}
