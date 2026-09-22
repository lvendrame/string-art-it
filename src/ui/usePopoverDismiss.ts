import { useEffect } from "react";
import type { RefObject } from "react";

// Extracted out of LanguageSwitcher.tsx once GridSettingsPopover.tsx and
// ChangeBackgroundPopover.tsx needed the identical pointerdown-outside + Escape
// dismissal (docs/conventions/ui-patterns.md §Anchored settings popover). ZoomControl
// passes escapeKey:false — its Escape handling is local (revert() vs close-list),
// not a plain close, so it stays on the consumer's own onKeyDown.
export function usePopoverDismiss(
  containerRef: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
  options?: { escapeKey?: boolean },
) {
  const escapeKey = options?.escapeKey ?? true;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("pointerdown", onPointerDown);
    if (escapeKey) document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      if (escapeKey) document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, containerRef, escapeKey]);
}
