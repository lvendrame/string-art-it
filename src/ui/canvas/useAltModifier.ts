import { useEffect, useRef } from "react";

// docs/specs/13-shape-constraint-modifier — tracked via a ref (not state) since it's
// read inside event handlers, not rendered.
export function useAltModifier() {
  const altHeldRef = useRef(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Alt") altHeldRef.current = true; };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === "Alt") altHeldRef.current = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return altHeldRef;
}
