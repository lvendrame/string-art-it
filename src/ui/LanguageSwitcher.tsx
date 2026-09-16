import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Globe } from "lucide-react";
import { LANGUAGE_META, SUPPORTED_LANGUAGES, isSupportedLanguage, type SupportedLanguage } from "../i18n/languages";

// Cross-cutting (used by both BoardSetup and EditorShell), so it lives at src/ui/'s top
// level rather than under panels/ or toolbars/. No existing Select/Dropdown vocabulary
// entry in docs/specs/18-design-system.md — this introduces one, documented in
// docs/specs/24-internationalization.md. Both mount points share the same global
// i18n.language, so they always agree without any prop threading.
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current: SupportedLanguage = isSupportedLanguage(i18n.language) ? i18n.language : "en";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function select(lng: SupportedLanguage) {
    void i18n.changeLanguage(lng);
    setOpen(false);
  }

  function onMenuKeyDown(e: React.KeyboardEvent) {
    const count = SUPPORTED_LANGUAGES.length;
    const currentIndex = optionRefs.current.findIndex((el) => el === document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = currentIndex === -1 ? 0 : (currentIndex + 1) % count;
      optionRefs.current[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = currentIndex === -1 ? count - 1 : (currentIndex - 1 + count) % count;
      optionRefs.current[prev]?.focus();
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("language.trigger")}: ${LANGUAGE_META[current].nativeLabel}`}
        onClick={() => setOpen((o) => !o)}
        style={{ borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 600, gap: 6 }}
      >
        <Globe size={14} />
        {LANGUAGE_META[current].nativeLabel}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={t("language.trigger")}
          onKeyDown={onMenuKeyDown}
          style={{
            position: "absolute",
            top: "110%",
            right: 0,
            zIndex: 20,
            background: "var(--bg-panel-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 6,
            minWidth: 170,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {SUPPORTED_LANGUAGES.map((lng, i) => (
            <button
              key={lng}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              type="button"
              role="option"
              aria-selected={lng === current}
              onClick={() => select(lng)}
              className={`btn${lng === current ? " btn-active" : ""}`}
              style={{
                justifyContent: "space-between",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "7px 10px",
                fontSize: 12.5,
              }}
            >
              {LANGUAGE_META[lng].nativeLabel}
              {lng === current && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
