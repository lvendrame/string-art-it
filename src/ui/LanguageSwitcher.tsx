import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Globe } from "lucide-react";
import { LANGUAGE_META, SUPPORTED_LANGUAGES, isSupportedLanguage, type SupportedLanguage } from "../i18n/languages";
import { AnchoredPopover } from "./AnchoredPopover";
import { usePopoverDismiss } from "./usePopoverDismiss";
import "./LanguageSwitcher.css";

// docs/specs/34-keyboard-shortcuts.md — the New Board screen's "L" shortcut: first
// press opens the dropdown, a further press while open cycles to the next language.
// Exposed only for that screen's own local shortcut listener (EditorShell's copy of
// this component doesn't need it, so the ref is optional and unused there).
export interface LanguageSwitcherHandle {
  openOrCycle: () => void;
}

// Cross-cutting (used by both BoardSetup and EditorShell), so it lives at src/ui/'s top
// level rather than under panels/ or toolbars/. No existing Select/Dropdown vocabulary
// entry in docs/specs/18-design-system.md — this introduces one, documented in
// docs/specs/24-internationalization.md. Both mount points share the same global
// i18n.language, so they always agree without any prop threading.
export const LanguageSwitcher = forwardRef<LanguageSwitcherHandle>(function LanguageSwitcher(_props, ref) {
  const { t, i18n } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current: SupportedLanguage = isSupportedLanguage(i18n.language) ? i18n.language : "en";

  usePopoverDismiss(containerRef, open, () => setOpen(false));

  function select(lng: SupportedLanguage) {
    void i18n.changeLanguage(lng);
    setOpen(false);
  }

  useImperativeHandle(ref, () => ({
    openOrCycle: () => {
      if (!open) {
        setOpen(true);
        return;
      }
      const currentIndex = SUPPORTED_LANGUAGES.indexOf(current);
      select(SUPPORTED_LANGUAGES[(currentIndex + 1) % SUPPORTED_LANGUAGES.length]);
    },
  }));

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
    <div ref={containerRef} className="popover-trigger">
      <button
        type="button"
        className="btn language-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("language.trigger")}: ${LANGUAGE_META[current].nativeLabel}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Globe size={14} />
        {LANGUAGE_META[current].nativeLabel}
        <ChevronDown size={12} />
      </button>
      {open && (
        <AnchoredPopover
          align="right"
          variant="panel-2"
          role="listbox"
          aria-label={t("language.trigger")}
          onKeyDown={onMenuKeyDown}
          className="language-switcher__panel"
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
              className={`btn language-switcher__option${lng === current ? " btn-active" : ""}`}
            >
              {LANGUAGE_META[lng].nativeLabel}
              {lng === current && <Check size={14} />}
            </button>
          ))}
        </AnchoredPopover>
      )}
    </div>
  );
});
