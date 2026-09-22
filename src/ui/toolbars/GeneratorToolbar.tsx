import { Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GENERATOR_PATTERNS, type GeneratorPatternId } from "../../application/document";
import "./GeneratorToolbar.css";

// docs/specs/32-generator-mode.md — the pattern selector. Same native-<select>-in-
// styled-<label> shape as PinToolbar's polygon/star family picker (docs/conventions/
// ui-patterns.md §6 — no dedicated dropdown component exists in this codebase, and none
// is invented here).
export function GeneratorToolbar({ patternId, onChange }: { patternId: GeneratorPatternId; onChange: (id: GeneratorPatternId) => void }) {
  const { t } = useTranslation("toolbars");

  return (
    <div className="generator-toolbar">
      <div className="generator-toolbar__section-title">{t("generatorToolbar.sectionTitle")}</div>
      <label className="btn generator-toolbar__picker">
        <span className="generator-toolbar__picker-label">
          <Wand2 size={14} />
          {t("generatorToolbar.patternLabel")}
        </span>
        <select
          aria-label={t("generatorToolbar.patternLabel")}
          value={patternId}
          onChange={(e) => onChange(e.target.value as GeneratorPatternId)}
          className="generator-toolbar__select"
        >
          {Object.values(GENERATOR_PATTERNS).map((def) => (
            <option key={def.id} value={def.id}>
              {t(`generatorToolbar.patterns.${def.labelKey}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
