import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EditorStore } from "@application/document";
import type { Viewport } from "@domain/transforms";
import { zoomToPercent } from "@domain/transforms";
import { ZOOM_PRESET_PERCENTS, zoomToPercentStep } from "./zoomSteps";
import { getCanvasViewportCenter } from "./canvasViewportSize";
import { AnchoredPopover } from "@ui/AnchoredPopover";
import { usePopoverDismiss } from "@ui/usePopoverDismiss";
import "./ZoomControl.css";

const ZOOM_LISTBOX_ID = "zoom-control-listbox";

// docs/conventions/ui-patterns.md §Anchored settings popover — same shape as
// LanguageSwitcher.tsx (position:relative trigger + absolute listbox, pointerdown-outside
// + Escape dismissal, ArrowUp/ArrowDown roving focus across option refs). The new part is
// the trigger being an editable <input> (typed zoom value) rather than a plain button —
// nothing else in the app combines free text entry with picking from a list.
export function ZoomControl({ store, viewport }: { store: EditorStore; viewport: Viewport }) {
  const { t } = useTranslation("toolbars");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Guards the blur fired synchronously by revert()'s inputRef.blur() call: that fires
  // before React flushes the setText/setEditing updates, so onBlur would otherwise read
  // the pre-revert `text` and re-commit the very value Escape was meant to discard.
  const revertingRef = useRef(false);

  const currentPercent = Math.round(zoomToPercent(viewport.zoom));
  const displayText = editing ? text : `${currentPercent}%`;

  // escapeKey:false — Escape is handled locally below (revert() on the input,
  // close-and-refocus on the list), not a plain close.
  usePopoverDismiss(containerRef, open, () => setOpen(false), { escapeKey: false });

  function applyPercent(percent: number) {
    store.setViewport(zoomToPercentStep(viewport, percent, getCanvasViewportCenter()));
  }

  function commit() {
    const parsed = Number(text.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed) && text.trim() !== "") applyPercent(parsed);
    setEditing(false);
    setOpen(false);
  }

  function revert() {
    revertingRef.current = true;
    setText(`${currentPercent}%`);
    setEditing(false);
    setOpen(false);
    inputRef.current?.blur();
  }

  function selectPreset(percent: number) {
    applyPercent(percent);
    setOpen(false);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      revert();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => optionRefs.current[0]?.focus());
    }
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    const count = ZOOM_PRESET_PERCENTS.length;
    const currentIndex = optionRefs.current.findIndex((el) => el === document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = currentIndex === -1 ? 0 : (currentIndex + 1) % count;
      optionRefs.current[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = currentIndex === -1 ? count - 1 : (currentIndex - 1 + count) % count;
      optionRefs.current[prev]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div ref={containerRef} className="popover-trigger zoom-control__trigger-row">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={ZOOM_LISTBOX_ID}
        aria-label={t("canvasToolbar.zoomLevel")}
        className="mono zoom-control__input"
        value={displayText}
        onFocus={(e) => {
          setEditing(true);
          setText(String(currentPercent));
          e.target.select();
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onInputKeyDown}
        onBlur={() => {
          if (revertingRef.current) {
            revertingRef.current = false;
            return;
          }
          if (!open) commit();
        }}
      />
      <button
        type="button"
        aria-label={t("canvasToolbar.zoomOptions")}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="btn zoom-control__chevron"
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronDown size={12} />
      </button>
      {open && (
        <AnchoredPopover
          align="right"
          variant="panel-2"
          id={ZOOM_LISTBOX_ID}
          role="listbox"
          aria-label={t("canvasToolbar.zoomOptions")}
          onKeyDown={onListKeyDown}
          className="zoom-control__panel"
        >
          {ZOOM_PRESET_PERCENTS.map((percent, i) => (
            <button
              key={percent}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              type="button"
              role="option"
              aria-selected={percent === currentPercent}
              className={`btn mono zoom-control__option${percent === currentPercent ? " btn-active" : ""}`}
              onClick={() => selectPreset(percent)}
            >
              {percent}%
            </button>
          ))}
        </AnchoredPopover>
      )}
    </div>
  );
}
