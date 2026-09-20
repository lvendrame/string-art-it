import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EditorStore } from "../../application/document";
import type { Viewport } from "../../domain/transforms";
import { zoomToPercent } from "../../domain/transforms";
import { VIEWPORT_CENTER, ZOOM_PRESET_PERCENTS, zoomToPercentStep } from "./zoomSteps";

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
  const [text, setText] = useState(() => `${Math.round(zoomToPercent(viewport.zoom))}%`);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Guards the blur fired synchronously by revert()'s inputRef.blur() call: that fires
  // before React flushes the setText/setEditing updates, so onBlur would otherwise read
  // the pre-revert `text` and re-commit the very value Escape was meant to discard.
  const revertingRef = useRef(false);

  const currentPercent = Math.round(zoomToPercent(viewport.zoom));

  useEffect(() => {
    if (editing) return;
    setText(`${currentPercent}%`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPercent, editing]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function applyPercent(percent: number) {
    store.setViewport(zoomToPercentStep(viewport, percent, VIEWPORT_CENTER));
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
    <div ref={containerRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={ZOOM_LISTBOX_ID}
        aria-label={t("canvasToolbar.zoomLevel")}
        className="mono"
        value={text}
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
        style={{
          width: 48,
          textAlign: "center",
          background: "var(--bg-panel-2)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          color: "var(--text-primary)",
          padding: "5px 4px",
          fontSize: 12,
        }}
      />
      <button
        type="button"
        aria-label={t("canvasToolbar.zoomOptions")}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="btn"
        onClick={() => setOpen((o) => !o)}
        style={{ borderRadius: 6, padding: "5px 2px", marginLeft: 2 }}
      >
        <ChevronDown size={12} />
      </button>
      {open && (
        <div
          id={ZOOM_LISTBOX_ID}
          role="listbox"
          aria-label={t("canvasToolbar.zoomOptions")}
          onKeyDown={onListKeyDown}
          style={{
            position: "absolute",
            top: "110%",
            right: 0,
            zIndex: 20,
            background: "var(--bg-panel-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 6,
            minWidth: 90,
            maxHeight: 260,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            boxShadow: "var(--shadow-float)",
          }}
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
              className={`btn mono${percent === currentPercent ? " btn-active" : ""}`}
              onClick={() => selectPreset(percent)}
              style={{ border: "none", borderRadius: "var(--radius-sm)", padding: "6px 8px", fontSize: 12, textAlign: "right" }}
            >
              {percent}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
