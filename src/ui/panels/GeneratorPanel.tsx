import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { GENERATOR_PATTERNS, maxGeneratorColours, type EditorStore, type FreestyleCircleParams, type GeneratorParams, type GeneratorPatternId } from "../../application/document";
import { GeneratorToolbar } from "../toolbars/GeneratorToolbar";
import { useEditorState } from "../useEditorStore";

const FIELD_LABEL_STYLE: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "var(--text-secondary)" };
const FIELD_INPUT_STYLE: CSSProperties = { width: 60, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "3px 6px" };

// Same auto-pick palette precedent as ThreadPropertiesPanel.tsx's colour-count buttons
// — a new swatch (the `+` button) is seeded from here rather than left blank/repeated.
const PALETTE = ["#5b8def", "#edeff7", "#e8b449", "#d96c6c", "#8fd6c8", "#c792ea", "#7ee787", "#ff9e64"];

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

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <label style={FIELD_LABEL_STYLE}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...FIELD_INPUT_STYLE, width: "auto" }}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-secondary)" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
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
  const [colours, setColours] = useState<string[]>(() => [store.getState().threadDefaults.colours[0] ?? PALETTE[0]]);
  const draft = state.generatorDraft;

  function changePattern(id: GeneratorPatternId) {
    setPatternId(id);
    setParams(GENERATOR_PATTERNS[id].defaultParams);
  }

  function set<K extends string>(key: K, value: number) {
    setParams((p) => ({ ...p, [key]: value }) as GeneratorParams);
  }

  // docs/specs/32-generator-mode.md §Multicolor — `colours` can hold more entries than
  // the CURRENT pattern/params can use (e.g. switching from Mandala with 5 layers/
  // colours down to Star, capped at 1) — clamped here for display/generation rather
  // than eagerly truncated in state, so raising `layers` back up later restores the
  // colours the user already picked instead of re-rolling from PALETTE.
  const maxColours = maxGeneratorColours(params);
  // Memoized (not just sliced inline) so its reference stays stable across renders
  // that don't actually change the palette or cap — the auto-apply effect below keys
  // off this reference, and an unmemoized new array every render would reset its
  // debounce timer forever (including after generatePattern's own store update
  // triggers a re-render), regenerating in an endless loop even with no user input.
  const visibleColours = useMemo(() => colours.slice(0, Math.max(1, maxColours)), [colours, maxColours]);

  function addColour() {
    if (visibleColours.length >= maxColours) return;
    setColours([...visibleColours, PALETTE[visibleColours.length % PALETTE.length]]);
  }

  function removeColour() {
    if (visibleColours.length <= 1) return;
    setColours(visibleColours.slice(0, -1));
  }

  function setColourAt(index: number, value: string) {
    setColours(visibleColours.map((c, i) => (i === index ? value : c)));
  }

  // docs/specs/32-generator-mode.md — once the user has generated at least once
  // (`draft` exists), every later pattern/param/colour edit re-generates automatically
  // instead of requiring an explicit "Re-generate" click, debounced so a fast run of
  // keystrokes (typing a 3-digit number, dragging... ) doesn't recompute on every
  // partial value. `justGeneratedRef` suppresses the ONE redundant immediate re-run
  // this effect would otherwise fire right after the manual Generate click below (same
  // params/colours, already applied) — every SUBSEQUENT real edit still debounces
  // normally. Skipped entirely while `draft` is null: editing fields before the first
  // Generate click must not auto-generate anything.
  const justGeneratedRef = useRef(false);
  const hasDraft = draft !== null;

  useEffect(() => {
    if (!hasDraft) return;
    if (justGeneratedRef.current) {
      justGeneratedRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      store.generatePattern(params, visibleColours);
    }, 300);
    return () => clearTimeout(timer);
  }, [hasDraft, params, visibleColours, store]);

  function handleGenerateClick() {
    justGeneratedRef.current = true;
    store.generatePattern(params, visibleColours);
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
            <NumberField label={t("generatorPanel.fields.sideNails")} value={params.sideNails} min={2} max={200} onChange={(v) => set("sideNails", v)} />
            <NumberField label={t("generatorPanel.fields.starPoints")} value={params.starPoints} min={3} max={20} onChange={(v) => set("starPoints", v)} />
            <NumberField label={t("generatorPanel.fields.starOuterRatio")} value={params.starOuterRatio} min={0.1} max={1} step={0.05} onChange={(v) => set("starOuterRatio", v)} />
            <NumberField label={t("generatorPanel.fields.starInnerRatio")} value={params.starInnerRatio} min={0} max={0.95} step={0.05} onChange={(v) => set("starInnerRatio", v)} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "star-of-david" && (
          <>
            <NumberField label={t("generatorPanel.fields.depth")} value={params.depth} min={1} max={40} onChange={(v) => set("depth", v)} />
            <NumberField label={t("generatorPanel.fields.layerAngle")} value={params.layerAngle} min={0.02} max={0.15} step={0.001} onChange={(v) => set("layerAngle", v)} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-secondary)" }}>
              <input
                type="checkbox"
                checked={params.mirrorTiling}
                onChange={(e) => setParams((p) => (p.patternId === "star-of-david" ? { ...p, mirrorTiling: e.target.checked } : p))}
              />
              {t("generatorPanel.fields.mirrorTiling")}
            </label>
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

        {params.patternId === "wave" && (
          <>
            <NumberField label={t("generatorPanel.fields.n")} value={params.n} min={3} max={400} onChange={(v) => set("n", v)} />
            <NumberField label={t("generatorPanel.fields.base")} value={params.base} min={2} max={99} onChange={(v) => set("base", v)} />
            <NumberField label={t("generatorPanel.fields.layers")} value={params.layers} min={1} max={20} onChange={(v) => set("layers", v)} />
            <NumberField label={t("generatorPanel.fields.layerFill")} value={params.layerFill} min={1} max={400} onChange={(v) => set("layerFill", v)} />
            <NumberField label={t("generatorPanel.fields.layerSpread")} value={params.layerSpread} min={0} max={200} onChange={(v) => set("layerSpread", v)} />
          </>
        )}

        {params.patternId === "hexagon-spades" && (
          <>
            <NumberField label={t("generatorPanel.fields.depth")} value={params.depth} min={1} max={40} onChange={(v) => set("depth", v)} />
            <NumberField label={t("generatorPanel.fields.layerAngle")} value={params.layerAngle} min={0.02} max={0.15} step={0.001} onChange={(v) => set("layerAngle", v)} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
            <CheckboxField
              label={t("generatorPanel.fields.mirrorTiling")}
              checked={params.mirrorTiling}
              onChange={(v) => setParams((p) => (p.patternId === "hexagon-spades" ? { ...p, mirrorTiling: v } : p))}
            />
          </>
        )}

        {params.patternId === "dance-of-planets" && (
          <>
            <SelectField
              label={t("generatorPanel.fields.outerType")}
              value={params.outerType}
              options={[
                { value: "circle", label: t("generatorPanel.fields.shapeCircle") },
                { value: "polygon", label: t("generatorPanel.fields.shapePolygon") },
              ]}
              onChange={(v) => setParams((p) => (p.patternId === "dance-of-planets" ? { ...p, outerType: v as "circle" | "polygon" } : p))}
            />
            <NumberField label={t("generatorPanel.fields.outerNails")} value={params.outerNails} min={3} max={400} onChange={(v) => set("outerNails", v)} />
            {params.outerType === "polygon" && <NumberField label={t("generatorPanel.fields.outerSides")} value={params.outerSides} min={3} max={20} onChange={(v) => set("outerSides", v)} />}
            <SelectField
              label={t("generatorPanel.fields.innerType")}
              value={params.innerType}
              options={[
                { value: "circle", label: t("generatorPanel.fields.shapeCircle") },
                { value: "polygon", label: t("generatorPanel.fields.shapePolygon") },
              ]}
              onChange={(v) => setParams((p) => (p.patternId === "dance-of-planets" ? { ...p, innerType: v as "circle" | "polygon" } : p))}
            />
            <NumberField label={t("generatorPanel.fields.innerNails")} value={params.innerNails} min={3} max={400} onChange={(v) => set("innerNails", v)} />
            {params.innerType === "polygon" && <NumberField label={t("generatorPanel.fields.innerSides")} value={params.innerSides} min={3} max={20} onChange={(v) => set("innerSides", v)} />}
            <NumberField label={t("generatorPanel.fields.innerSizeRatio")} value={params.innerSizeRatio} min={0.05} max={0.95} step={0.05} onChange={(v) => set("innerSizeRatio", v)} />
            <NumberField label={t("generatorPanel.fields.rounds")} value={params.rounds} min={1} max={20} onChange={(v) => set("rounds", v)} />
            <CheckboxField label={t("generatorPanel.fields.reverse")} checked={params.reverse} onChange={(v) => setParams((p) => (p.patternId === "dance-of-planets" ? { ...p, reverse: v } : p))} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "sun" && (
          <>
            <NumberField label={t("generatorPanel.fields.sideNails")} value={params.sideNails} min={2} max={200} onChange={(v) => set("sideNails", v)} />
            <NumberField label={t("generatorPanel.fields.starPoints")} value={params.starPoints} min={3} max={20} onChange={(v) => set("starPoints", v)} />
            <NumberField label={t("generatorPanel.fields.starOuterRatio")} value={params.starOuterRatio} min={0.1} max={1} step={0.05} onChange={(v) => set("starOuterRatio", v)} />
            <NumberField label={t("generatorPanel.fields.starInnerRatio")} value={params.starInnerRatio} min={0} max={0.95} step={0.05} onChange={(v) => set("starInnerRatio", v)} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
            <NumberField label={t("generatorPanel.fields.layers")} value={params.layers} min={0} max={10} onChange={(v) => set("layers", v)} />
            <NumberField label={t("generatorPanel.fields.layerSpread")} value={params.layerSpread} min={0} max={0.3} step={0.01} onChange={(v) => set("layerSpread", v)} />
          </>
        )}

        {params.patternId === "vortex" && (
          <>
            <NumberField label={t("generatorPanel.fields.sides")} value={params.sides} min={3} max={20} onChange={(v) => set("sides", v)} />
            <NumberField label={t("generatorPanel.fields.layers")} value={params.layers} min={1} max={40} onChange={(v) => set("layers", v)} />
            <NumberField label={t("generatorPanel.fields.layerAngle")} value={params.layerAngle} min={0.01} max={0.2} step={0.005} onChange={(v) => set("layerAngle", v)} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "polygon" && (
          <>
            <NumberField label={t("generatorPanel.fields.sides")} value={params.sides} min={3} max={20} onChange={(v) => set("sides", v)} />
            <NumberField label={t("generatorPanel.fields.nailsPerSide")} value={params.nailsPerSide} min={2} max={100} onChange={(v) => set("nailsPerSide", v)} />
            <NumberField label={t("generatorPanel.fields.bezierStep")} value={params.bezierStep} min={1} max={19} onChange={(v) => set("bezierStep", v)} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "flower" && (
          <>
            <NumberField label={t("generatorPanel.fields.sides")} value={params.sides} min={3} max={20} onChange={(v) => set("sides", v)} />
            <NumberField label={t("generatorPanel.fields.nailsPerSide")} value={params.nailsPerSide} min={2} max={100} onChange={(v) => set("nailsPerSide", v)} />
            <NumberField label={t("generatorPanel.fields.layers")} value={params.layers} min={1} max={20} onChange={(v) => set("layers", v)} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "assymetry" && (
          <>
            <NumberField label={t("generatorPanel.fields.circleNails")} value={params.circleNails} min={3} max={400} onChange={(v) => set("circleNails", v)} />
            <NumberField label={t("generatorPanel.fields.startFraction")} value={params.startFraction} min={0} max={1} step={0.05} onChange={(v) => set("startFraction", v)} />
            <NumberField label={t("generatorPanel.fields.endFraction")} value={params.endFraction} min={0} max={1} step={0.05} onChange={(v) => set("endFraction", v)} />
            <CheckboxField label={t("generatorPanel.fields.reverse")} checked={params.reverse} onChange={(v) => setParams((p) => (p.patternId === "assymetry" ? { ...p, reverse: v } : p))} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "spiral" && (
          <>
            <NumberField label={t("generatorPanel.fields.n")} value={params.n} min={10} max={400} onChange={(v) => set("n", v)} />
            <NumberField label={t("generatorPanel.fields.repetition")} value={params.repetition} min={1} max={20} onChange={(v) => set("repetition", v)} />
            <NumberField label={t("generatorPanel.fields.innerLength")} value={params.innerLength} min={1} max={100} onChange={(v) => set("innerLength", v)} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "maurer-rose" && (
          <>
            <NumberField label={t("generatorPanel.fields.N")} value={params.N} min={1} max={30} onChange={(v) => set("N", v)} />
            <NumberField label={t("generatorPanel.fields.maxSteps")} value={params.maxSteps} min={10} max={720} onChange={(v) => set("maxSteps", v)} />
            <NumberField label={t("generatorPanel.fields.angleDegrees")} value={params.angleDegrees} min={1} max={180} step={1} onChange={(v) => set("angleDegrees", v)} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "comet" && (
          <>
            <NumberField label={t("generatorPanel.fields.n")} value={params.n} min={10} max={400} onChange={(v) => set("n", v)} />
            <NumberField label={t("generatorPanel.fields.layers")} value={params.layers} min={1} max={40} onChange={(v) => set("layers", v)} />
            <NumberField label={t("generatorPanel.fields.firstLayerSize")} value={params.firstLayerSize} min={2} max={200} onChange={(v) => set("firstLayerSize", v)} />
            <NumberField label={t("generatorPanel.fields.distance")} value={params.distance} min={1} max={200} onChange={(v) => set("distance", v)} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "flower-of-life" && (
          <>
            <NumberField label={t("generatorPanel.fields.depth")} value={params.depth} min={1} max={40} onChange={(v) => set("depth", v)} />
            <NumberField label={t("generatorPanel.fields.layerAngle")} value={params.layerAngle} min={0.02} max={0.15} step={0.001} onChange={(v) => set("layerAngle", v)} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
            <CheckboxField
              label={t("generatorPanel.fields.ringEnabled")}
              checked={params.ringEnabled}
              onChange={(v) => setParams((p) => (p.patternId === "flower-of-life" ? { ...p, ringEnabled: v } : p))}
            />
            {params.ringEnabled && (
              <>
                <NumberField label={t("generatorPanel.fields.ringNails")} value={params.ringNails} min={3} max={400} onChange={(v) => set("ringNails", v)} />
                <NumberField label={t("generatorPanel.fields.ringBase")} value={params.ringBase} min={2} max={99} onChange={(v) => set("ringBase", v)} />
              </>
            )}
          </>
        )}

        {params.patternId === "lotus" && (
          <>
            <NumberField label={t("generatorPanel.fields.sides")} value={params.sides} min={3} max={20} onChange={(v) => set("sides", v)} />
            <NumberField label={t("generatorPanel.fields.nailsPerCircle")} value={params.nailsPerCircle} min={3} max={200} onChange={(v) => set("nailsPerCircle", v)} />
            <NumberField label={t("generatorPanel.fields.radiusRatio")} value={params.radiusRatio} min={0.1} max={0.9} step={0.05} onChange={(v) => set("radiusRatio", v)} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "crosses" && (
          <>
            <NumberField label={t("generatorPanel.fields.nailsPerLine")} value={params.nailsPerLine} min={2} max={100} onChange={(v) => set("nailsPerLine", v)} />
            <NumberField label={t("generatorPanel.fields.gap")} value={params.gap} min={0.02} max={0.4} step={0.01} onChange={(v) => set("gap", v)} />
            <NumberField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
          {t("generatorPanel.coloursSectionTitle")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {visibleColours.map((c, i) => (
            <input
              key={i}
              type="color"
              aria-label={t("generatorPanel.colourN", { n: i + 1 })}
              value={c}
              onChange={(e) => setColourAt(i, e.target.value)}
              style={{ width: 24, height: 24, border: "1px solid var(--border-strong)", borderRadius: 5, background: "none", padding: 0 }}
            />
          ))}
          <button
            className="btn"
            aria-label={t("generatorPanel.addColour")}
            disabled={visibleColours.length >= maxColours}
            onClick={addColour}
            style={{ width: 24, height: 24, padding: 0, justifyContent: "center", borderRadius: 5, fontSize: 14, fontWeight: 700 }}
          >
            +
          </button>
          <button
            className="btn"
            aria-label={t("generatorPanel.removeColour")}
            disabled={visibleColours.length <= 1}
            onClick={removeColour}
            style={{ width: 24, height: 24, padding: 0, justifyContent: "center", borderRadius: 5, fontSize: 14, fontWeight: 700 }}
          >
            −
          </button>
        </div>
        {maxColours > 1 && (
          <div style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>{t("generatorPanel.coloursMax", { max: maxColours })}</div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {!draft && (
          <button
            className="btn btn-active"
            style={{ width: "100%", justifyContent: "center", borderRadius: "var(--radius-sm)", padding: "9px 4px", fontSize: 12, fontWeight: 700 }}
            onClick={handleGenerateClick}
          >
            {t("generatorPanel.generate")}
          </button>
        )}
        {draft && (
          <>
            <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", textAlign: "center" }}>{t("generatorPanel.liveHint")}</div>
            <button className="btn" style={{ width: "100%", justifyContent: "center", borderRadius: "var(--radius-sm)", padding: "9px 4px", fontSize: 12, fontWeight: 700 }} onClick={() => store.confirmGeneratedPattern()}>
              {t("generatorPanel.confirm")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
