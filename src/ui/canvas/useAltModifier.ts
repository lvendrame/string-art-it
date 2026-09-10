import { useEffect, useState } from "react";

// docs/specs/13-shape-constraint-modifier — tracked as state (not a ref) since the
// live preview geometry rendered in Canvas.tsx depends on it.
export function useAltModifier() {
  const [altHeld, setAltHeld] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Alt") setAltHeld(true); };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === "Alt") setAltHeld(false); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return altHeld;
}
