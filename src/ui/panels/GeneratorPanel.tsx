import { useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { GENERATOR_PATTERNS, type EditorStore, type FreestyleCircleParams, type GeneratorParams, type GeneratorPatternId } from "../../application/document";
import { GeneratorToolbar } from "../toolbars/GeneratorToolbar";
import { useEditorState } from "../useEditorStore";

const FIELD_LABEL_STYLE: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "var(--text-secondary)" };
const FIELD_INPUT_STYLE: CSSProperties = { width: 60, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "3px 6px" };

function NumberField({ label, value, min, max, step, onChange }: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (value: number) => void }) {
  return (
    <label style={FIELD_LABEL_STYLE}>
      {label}
      <input type="number" className="mono" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={FIELD_INPUT_STYLE} />
    </label>
  );
}

function updateFreestyleCircle(circles: FreestyleCircleParams[], index: number, patch: Partial<FreestyleCircleParams>): FreestyleCircleParams[] {
  return circles.map((c, i) => (i === index ? { ...c, ...patch } : c));
}

// docs/specs/32-generator-mode.md — pattern/param SELECTION is local, ephemeral UI
// state, not document state: it's discarded on Re-generate (a fresh draft replaces the
// old one wholesale) and on leaving Generator mode entirely (EditorStore.setMode drops
// any uncommitted generatorDraft), so there is nothing here worth surviving a remount —
// same rationale as not routing it through EditorStore.
export function GeneratorPanel({ store }: { store: EditorStore }) {
  const { t } = useTranslation(["panels", "toolbars"]);
  const state = useEditorState(store);
  const [patternId, setPatternId] = useState<GeneratorPatternId>("mandala");
  const [params, setParams] = useState<GeneratorParams>(GENERATOR_PATTERNS.mandala.defaultParams);
  const draft = state.generatorDraft;

  function changePattern(id: GeneratorPatternId) {
    setPatternId(id);
    setParams(GENERATOR_PATTERNS[id].defaultParams);
  }

  function set<K extends string>(key: K, value: number) {
    setParams((p) => ({ ...p, [key]: value }) as GeneratorParams);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <GeneratorToolbar patternId={patternId} onChange={changePattern} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 10 }}>
        {params.patternId === "mandala" && (
          <>
            <NumberField label={t("generatorPanel.fields.n")} value={params.n} min={3} max={400} onChange={(v) => set("n", v)} />
            <NumberField label={t("generatorPanel.fields.base")} value={params.base} min={2} max={99} onChange={(v) => set("base", v)} />
            <NumberField label={t("generatorPanel.fields.layers")} value={params.layers} min={1} max={20} onChange={(v) => set("layers", v)} />
          </>
        )}

        {params.patternId === "star" && (
          <>
            <NumberField label={t("generatorPanel.fields.circleNails")} value={params.circleNails} min={5} max={300} onChange={(v) => set("circleNails", v)} />
            <NumberField label={t("generatorPanel.fields.starPoints")} value={params.starPoints} min={3} max={20} onChange={(v) => set("starPoints", v)} />
            <NumberField label={t("generatorPanel.fields.starOuterRatio")} value={params.starOuterRatio} min={0.1} max={1} step={0.05} onChange={(v) => set("starOuterRatio", v)} />
            <NumberField label={t("generatorPanel.fields.starInnerRatio")} value={params.starInnerRatio} min={0.05} max={0.95} step={0.05} onChange={(v) => set("starInnerRatio", v)} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "star-of-david" && (
          <>
            <NumberField label={t("generatorPanel.fields.nailsPerSide")} value={params.nailsPerSide} min={2} max={100} onChange={(v) => set("nailsPerSide", v)} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "spirals" && (
          <>
            <NumberField label={t("generatorPanel.fields.arms")} value={params.arms} min={2} max={20} onChange={(v) => set("arms", v)} />
            <NumberField label={t("generatorPanel.fields.nailsPerSpiral")} value={params.nailsPerSpiral} min={3} max={300} onChange={(v) => set("nailsPerSpiral", v)} />
            <NumberField label={t("generatorPanel.fields.totalAngleTurns")} value={params.totalAngleTurns} min={0} max={5} step={0.05} onChange={(v) => set("totalAngleTurns", v)} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "freestyle" &&
          params.circles.map((circle, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: i > 0 ? 8 : 0, borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-secondary)", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={circle.enabled}
                  onChange={(e) => setParams((p) => (p.patternId === "freestyle" ? { ...p, circles: updateFreestyleCircle(p.circles, i, { enabled: e.target.checked }) } : p))}
                />
                {t("generatorPanel.fields.circleN", { n: i + 1 })}
              </label>
              <NumberField
                label={t("generatorPanel.fields.nails")}
                value={circle.nails}
                min={1}
                max={300}
                onChange={(v) => setParams((p) => (p.patternId === "freestyle" ? { ...p, circles: updateFreestyleCircle(p.circles, i, { nails: v }) } : p))}
              />
              <NumberField
                label={t("generatorPanel.fields.radiusRatio")}
                value={circle.radiusRatio}
                min={0.05}
                max={1}
                step={0.05}
                onChange={(v) => setParams((p) => (p.patternId === "freestyle" ? { ...p, circles: updateFreestyleCircle(p.circles, i, { radiusRatio: v }) } : p))}
              />
              <NumberField
                label={t("generatorPanel.fields.centerXRatio")}
                value={circle.centerXRatio}
                min={-1}
                max={1}
                step={0.05}
                onChange={(v) => setParams((p) => (p.patternId === "freestyle" ? { ...p, circles: updateFreestyleCircle(p.circles, i, { centerXRatio: v }) } : p))}
              />
              <NumberField
                label={t("generatorPanel.fields.centerYRatio")}
                value={circle.centerYRatio}
                min={-1}
                max={1}
                step={0.05}
                onChange={(v) => setParams((p) => (p.patternId === "freestyle" ? { ...p, circles: updateFreestyleCircle(p.circles, i, { centerYRatio: v }) } : p))}
              />
            </div>
          ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button className="btn btn-active" style={{ width: "100%", justifyContent: "center", borderRadius: "var(--radius-sm)", padding: "9px 4px", fontSize: 12, fontWeight: 700 }} onClick={() => store.generatePattern(params)}>
          {draft ? t("generatorPanel.regenerate") : t("generatorPanel.generate")}
        </button>
        {draft && (
          <button className="btn" style={{ width: "100%", justifyContent: "center", borderRadius: "var(--radius-sm)", padding: "9px 4px", fontSize: 12, fontWeight: 700 }} onClick={() => store.confirmGeneratedPattern()}>
            {t("generatorPanel.confirm")}
          </button>
        )}
      </div>
    </div>
  );
}
