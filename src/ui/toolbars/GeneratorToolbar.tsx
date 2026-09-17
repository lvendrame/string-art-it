import { Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GENERATOR_PATTERNS, type GeneratorPatternId } from "../../application/document";

// docs/specs/32-generator-mode.md — the pattern selector. Same native-<select>-in-
// styled-<label> shape as PinToolbar's polygon/star family picker (docs/conventions/
// ui-patterns.md §6 — no dedicated dropdown component exists in this codebase, and none
// is invented here).
export function GeneratorToolbar({ patternId, onChange }: { patternId: GeneratorPatternId; onChange: (id: GeneratorPatternId) => void }) {
  const { t } = useTranslation("toolbars");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        {t("generatorToolbar.sectionTitle")}
      </div>
      <label
        className="btn"
        style={{ width: "100%", justifyContent: "space-between", borderRadius: "var(--radius-sm)", padding: "9px 10px", gap: 6 }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
          <Wand2 size={14} />
          {t("generatorToolbar.patternLabel")}
        </span>
        <select
          aria-label={t("generatorToolbar.patternLabel")}
          value={patternId}
          onChange={(e) => onChange(e.target.value as GeneratorPatternId)}
          style={{ background: "transparent", color: "inherit", border: "none", fontSize: 12 }}
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
