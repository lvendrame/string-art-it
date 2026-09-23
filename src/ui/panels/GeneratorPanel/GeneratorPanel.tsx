import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GENERATOR_PATTERNS, maxGeneratorColours, type AssymetryLayerParams, type EditorStore, type FreestyleCircleParams, type GeneratorParams, type GeneratorPatternId } from "../../../application/document";
import { GeneratorToolbar } from "../../toolbars/GeneratorToolbar";
import { useEditorState } from "../../useEditorStore";
import { CheckboxField } from "../fields/CheckboxField";
import { SliderField } from "../fields/SliderField";
import { SelectField } from "./SelectField";
import "./GeneratorPanel.css";

// Same auto-pick palette precedent as ThreadPropertiesPanel.tsx's colour-count buttons
// — a new swatch (the `+` button) is seeded from here rather than left blank/repeated.
const PALETTE = ["#5b8def", "#edeff7", "#e8b449", "#d96c6c", "#8fd6c8", "#c792ea", "#7ee787", "#ff9e64"];

function updateFreestyleCircle(circles: FreestyleCircleParams[], index: number, patch: Partial<FreestyleCircleParams>): FreestyleCircleParams[] {
  return circles.map((c, i) => (i === index ? { ...c, ...patch } : c));
}

function updateAssymetryLayer(layers: AssymetryLayerParams[], index: number, patch: Partial<AssymetryLayerParams>): AssymetryLayerParams[] {
  return layers.map((l, i) => (i === index ? { ...l, ...patch } : l));
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
  // (`draft` exists), every later pattern/param/colour/thread-width edit re-generates
  // automatically instead of requiring an explicit "Re-generate" click, debounced so a
  // fast run of
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
  }, [hasDraft, params, visibleColours, state.threadDefaults.width, store]);

  function handleGenerateClick() {
    justGeneratedRef.current = true;
    store.generatePattern(params, visibleColours);
  }

  return (
    <div className="generator-panel">
      <GeneratorToolbar patternId={patternId} onChange={changePattern} />

      <div className="generator-panel__params-box">
        {params.patternId === "mandala" && (
          <>
            <SliderField label={t("generatorPanel.fields.n")} value={params.n} min={3} max={400} onChange={(v) => set("n", v)} />
            <SliderField label={t("generatorPanel.fields.base")} value={params.base} min={2} max={99} onChange={(v) => set("base", v)} />
            <SliderField label={t("generatorPanel.fields.layers")} value={params.layers} min={1} max={20} onChange={(v) => set("layers", v)} />
          </>
        )}

        {params.patternId === "star" && (
          <>
            <SliderField label={t("generatorPanel.fields.sideNails")} value={params.sideNails} min={2} max={200} onChange={(v) => set("sideNails", v)} />
            <SliderField label={t("generatorPanel.fields.starPoints")} value={params.starPoints} min={3} max={20} onChange={(v) => set("starPoints", v)} />
            <SliderField label={t("generatorPanel.fields.starOuterRatio")} value={params.starOuterRatio} min={0.1} max={1} step={0.05} onChange={(v) => set("starOuterRatio", v)} />
            <SliderField label={t("generatorPanel.fields.starInnerRatio")} value={params.starInnerRatio} min={0} max={0.95} step={0.05} onChange={(v) => set("starInnerRatio", v)} />
            <SliderField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "star-of-david" && (
          <>
            <SliderField label={t("generatorPanel.fields.depth")} value={params.depth} min={1} max={40} onChange={(v) => set("depth", v)} />
            <SliderField label={t("generatorPanel.fields.layerAngle")} value={params.layerAngle} min={0.02} max={0.15} step={0.001} onChange={(v) => set("layerAngle", v)} />
            <SliderField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
            <label className="generator-panel__toggle-label">
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
            <SliderField label={t("generatorPanel.fields.arms")} value={params.arms} min={2} max={20} onChange={(v) => set("arms", v)} />
            <SliderField label={t("generatorPanel.fields.nailsPerSpiral")} value={params.nailsPerSpiral} min={3} max={300} onChange={(v) => set("nailsPerSpiral", v)} />
            <SliderField label={t("generatorPanel.fields.totalAngleTurns")} value={params.totalAngleTurns} min={0} max={5} step={0.05} onChange={(v) => set("totalAngleTurns", v)} />
            <SliderField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "freestyle" &&
          params.circles.map((circle, i) => (
            <div key={i} className={`generator-panel__sub-item${i > 0 ? " generator-panel__sub-item--separated" : ""}`}>
              <label className="generator-panel__toggle-label generator-panel__toggle-label--bold">
                <input
                  type="checkbox"
                  checked={circle.enabled}
                  onChange={(e) => setParams((p) => (p.patternId === "freestyle" ? { ...p, circles: updateFreestyleCircle(p.circles, i, { enabled: e.target.checked }) } : p))}
                />
                {t("generatorPanel.fields.circleN", { n: i + 1 })}
              </label>
              <SliderField
                label={t("generatorPanel.fields.nails")}
                value={circle.nails}
                min={1}
                max={300}
                onChange={(v) => setParams((p) => (p.patternId === "freestyle" ? { ...p, circles: updateFreestyleCircle(p.circles, i, { nails: v }) } : p))}
              />
              <SliderField
                label={t("generatorPanel.fields.radiusRatio")}
                value={circle.radiusRatio}
                min={0.05}
                max={1}
                step={0.05}
                onChange={(v) => setParams((p) => (p.patternId === "freestyle" ? { ...p, circles: updateFreestyleCircle(p.circles, i, { radiusRatio: v }) } : p))}
              />
              <SliderField
                label={t("generatorPanel.fields.centerXRatio")}
                value={circle.centerXRatio}
                min={-1}
                max={1}
                step={0.05}
                onChange={(v) => setParams((p) => (p.patternId === "freestyle" ? { ...p, circles: updateFreestyleCircle(p.circles, i, { centerXRatio: v }) } : p))}
              />
              <SliderField
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
            <SliderField label={t("generatorPanel.fields.n")} value={params.n} min={3} max={400} onChange={(v) => set("n", v)} />
            <SliderField label={t("generatorPanel.fields.base")} value={params.base} min={2} max={99} onChange={(v) => set("base", v)} />
            <SliderField label={t("generatorPanel.fields.layers")} value={params.layers} min={1} max={20} onChange={(v) => set("layers", v)} />
            <SliderField label={t("generatorPanel.fields.layerFill")} value={params.layerFill} min={1} max={400} onChange={(v) => set("layerFill", v)} />
            <SliderField label={t("generatorPanel.fields.layerSpread")} value={params.layerSpread} min={0} max={200} onChange={(v) => set("layerSpread", v)} />
          </>
        )}

        {params.patternId === "hexagon-spades" && (
          <>
            <SliderField label={t("generatorPanel.fields.depth")} value={params.depth} min={1} max={40} onChange={(v) => set("depth", v)} />
            <SliderField label={t("generatorPanel.fields.layerAngle")} value={params.layerAngle} min={0.02} max={0.15} step={0.001} onChange={(v) => set("layerAngle", v)} />
            <SliderField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
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
            <SliderField label={t("generatorPanel.fields.outerNails")} value={params.outerNails} min={3} max={400} onChange={(v) => set("outerNails", v)} />
            {params.outerType === "polygon" && <SliderField label={t("generatorPanel.fields.outerSides")} value={params.outerSides} min={3} max={20} onChange={(v) => set("outerSides", v)} />}
            <SelectField
              label={t("generatorPanel.fields.innerType")}
              value={params.innerType}
              options={[
                { value: "circle", label: t("generatorPanel.fields.shapeCircle") },
                { value: "polygon", label: t("generatorPanel.fields.shapePolygon") },
              ]}
              onChange={(v) => setParams((p) => (p.patternId === "dance-of-planets" ? { ...p, innerType: v as "circle" | "polygon" } : p))}
            />
            <SliderField label={t("generatorPanel.fields.innerNails")} value={params.innerNails} min={3} max={400} onChange={(v) => set("innerNails", v)} />
            {params.innerType === "polygon" && <SliderField label={t("generatorPanel.fields.innerSides")} value={params.innerSides} min={3} max={20} onChange={(v) => set("innerSides", v)} />}
            <SliderField label={t("generatorPanel.fields.innerSizeRatio")} value={params.innerSizeRatio} min={0.05} max={0.95} step={0.05} onChange={(v) => set("innerSizeRatio", v)} />
            <SliderField label={t("generatorPanel.fields.rounds")} value={params.rounds} min={1} max={20} onChange={(v) => set("rounds", v)} />
            <CheckboxField label={t("generatorPanel.fields.reverse")} checked={params.reverse} onChange={(v) => setParams((p) => (p.patternId === "dance-of-planets" ? { ...p, reverse: v } : p))} />
            <SliderField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "sun" && (
          <>
            <SliderField label={t("generatorPanel.fields.sideNails")} value={params.sideNails} min={2} max={200} onChange={(v) => set("sideNails", v)} />
            <SliderField label={t("generatorPanel.fields.starPoints")} value={params.starPoints} min={3} max={20} onChange={(v) => set("starPoints", v)} />
            <SliderField label={t("generatorPanel.fields.starOuterRatio")} value={params.starOuterRatio} min={0.1} max={1} step={0.05} onChange={(v) => set("starOuterRatio", v)} />
            <SliderField label={t("generatorPanel.fields.starInnerRatio")} value={params.starInnerRatio} min={0} max={0.95} step={0.05} onChange={(v) => set("starInnerRatio", v)} />
            <SliderField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
            <SliderField label={t("generatorPanel.fields.layers")} value={params.layers} min={0} max={10} onChange={(v) => set("layers", v)} />
            <SliderField label={t("generatorPanel.fields.layerSpread")} value={params.layerSpread} min={0} max={0.3} step={0.01} onChange={(v) => set("layerSpread", v)} />
          </>
        )}

        {params.patternId === "vortex" && (
          <>
            <SliderField label={t("generatorPanel.fields.sides")} value={params.sides} min={3} max={10} onChange={(v) => set("sides", v)} />
            <SliderField label={t("generatorPanel.fields.nailsPerSide")} value={params.nailsPerSide} min={3} max={200} onChange={(v) => set("nailsPerSide", v)} />
            <SliderField label={t("generatorPanel.fields.layers")} value={params.layers} min={1} max={40} onChange={(v) => set("layers", v)} />
            <SliderField label={t("generatorPanel.fields.layerAngle")} value={params.layerAngle} min={0.01} max={0.2} step={0.005} onChange={(v) => set("layerAngle", v)} />
            <SliderField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "polygon" && (
          <>
            <SliderField label={t("generatorPanel.fields.sides")} value={params.sides} min={3} max={20} onChange={(v) => set("sides", v)} />
            <SliderField label={t("generatorPanel.fields.nailsPerSide")} value={params.nailsPerSide} min={2} max={100} onChange={(v) => set("nailsPerSide", v)} />
            <SliderField label={t("generatorPanel.fields.bezierStep")} value={params.bezierStep} min={1} max={19} onChange={(v) => set("bezierStep", v)} />
            <SliderField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "flower" && (
          <>
            <SliderField label={t("generatorPanel.fields.sides")} value={params.sides} min={3} max={20} onChange={(v) => set("sides", v)} />
            <SliderField label={t("generatorPanel.fields.nailsPerSide")} value={params.nailsPerSide} min={2} max={100} onChange={(v) => set("nailsPerSide", v)} />
            <SliderField label={t("generatorPanel.fields.layers")} value={params.layers} min={1} max={20} onChange={(v) => set("layers", v)} />
            <SliderField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "assymetry" && (
          <>
            <SliderField label={t("generatorPanel.fields.circleNails")} value={params.circleNails} min={3} max={400} onChange={(v) => set("circleNails", v)} />
            <SliderField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
            {params.layers.map((layer, i) => (
              <div key={i} className="generator-panel__sub-item generator-panel__sub-item--separated">
                <label className="generator-panel__toggle-label generator-panel__toggle-label--bold">
                  <input
                    type="checkbox"
                    checked={layer.enabled}
                    onChange={(e) => setParams((p) => (p.patternId === "assymetry" ? { ...p, layers: updateAssymetryLayer(p.layers, i, { enabled: e.target.checked }) } : p))}
                  />
                  {t("generatorPanel.fields.layerN", { n: i + 1 })}
                </label>
                <SliderField
                  label={t("generatorPanel.fields.startFraction")}
                  value={layer.start}
                  min={0}
                  max={1}
                  step={0.005}
                  onChange={(v) => setParams((p) => (p.patternId === "assymetry" ? { ...p, layers: updateAssymetryLayer(p.layers, i, { start: v }) } : p))}
                />
                <SliderField
                  label={t("generatorPanel.fields.endFraction")}
                  value={layer.end}
                  min={0}
                  max={1}
                  step={0.005}
                  onChange={(v) => setParams((p) => (p.patternId === "assymetry" ? { ...p, layers: updateAssymetryLayer(p.layers, i, { end: v }) } : p))}
                />
                <CheckboxField
                  label={t("generatorPanel.fields.reverse")}
                  checked={layer.reverse}
                  onChange={(v) => setParams((p) => (p.patternId === "assymetry" ? { ...p, layers: updateAssymetryLayer(p.layers, i, { reverse: v }) } : p))}
                />
              </div>
            ))}
          </>
        )}

        {params.patternId === "spiral" && (
          <>
            <SliderField label={t("generatorPanel.fields.n")} value={params.n} min={10} max={400} onChange={(v) => set("n", v)} />
            <SliderField label={t("generatorPanel.fields.repetition")} value={params.repetition} min={1} max={20} onChange={(v) => set("repetition", v)} />
            <SliderField label={t("generatorPanel.fields.innerLength")} value={params.innerLength} min={1} max={100} onChange={(v) => set("innerLength", v)} />
            <SliderField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "maurer-rose" && (
          <>
            <SliderField label={t("generatorPanel.fields.N")} value={params.N} min={1} max={30} onChange={(v) => set("N", v)} />
            <SliderField label={t("generatorPanel.fields.maxSteps")} value={params.maxSteps} min={10} max={720} onChange={(v) => set("maxSteps", v)} />
            <SliderField label={t("generatorPanel.fields.angleDegrees")} value={params.angleDegrees} min={1} max={180} step={1} onChange={(v) => set("angleDegrees", v)} />
            <SliderField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "comet" && (
          <>
            <SliderField label={t("generatorPanel.fields.n")} value={params.n} min={10} max={400} onChange={(v) => set("n", v)} />
            <SliderField label={t("generatorPanel.fields.layers")} value={params.layers} min={1} max={40} onChange={(v) => set("layers", v)} />
            <SliderField label={t("generatorPanel.fields.firstLayerSize")} value={params.firstLayerSize} min={2} max={200} onChange={(v) => set("firstLayerSize", v)} />
            <SliderField label={t("generatorPanel.fields.layerDistance")} value={params.layerDistance} min={1} max={200} onChange={(v) => set("layerDistance", v)} />
            <SliderField label={t("generatorPanel.fields.clusterStrength")} value={params.clusterStrength} min={0} max={1} step={0.05} onChange={(v) => set("clusterStrength", v)} />
            <SliderField label={t("generatorPanel.fields.distortion")} value={params.distortion} min={0} max={0.9} step={0.02} onChange={(v) => set("distortion", v)} />
            <SliderField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
          </>
        )}

        {params.patternId === "flower-of-life" && (
          <>
            <SliderField label={t("generatorPanel.fields.levels")} value={params.levels} min={1} max={6} onChange={(v) => set("levels", v)} />
            <SliderField label={t("generatorPanel.fields.density")} value={params.density} min={2} max={30} onChange={(v) => set("density", v)} />
            <SliderField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
            <CheckboxField
              label={t("generatorPanel.fields.ringEnabled")}
              checked={params.ringEnabled}
              onChange={(v) => setParams((p) => (p.patternId === "flower-of-life" ? { ...p, ringEnabled: v } : p))}
            />
            {params.ringEnabled && (
              <>
                <SliderField label={t("generatorPanel.fields.ringNails")} value={params.ringNails} min={3} max={400} onChange={(v) => set("ringNails", v)} />
                <SliderField label={t("generatorPanel.fields.ringBase")} value={params.ringBase} min={2} max={99} onChange={(v) => set("ringBase", v)} />
              </>
            )}
          </>
        )}

        {params.patternId === "crosses" && (
          <>
            <SliderField label={t("generatorPanel.fields.nailsPerLine")} value={params.nailsPerLine} min={2} max={100} onChange={(v) => set("nailsPerLine", v)} />
            <SelectField
              label={t("generatorPanel.fields.orientation")}
              value={params.orientation}
              options={[
                { value: "vertical", label: t("generatorPanel.fields.orientationVertical") },
                { value: "horizontal", label: t("generatorPanel.fields.orientationHorizontal") },
              ]}
              onChange={(v) => setParams((p) => (p.patternId === "crosses" ? { ...p, orientation: v as "vertical" | "horizontal" } : p))}
            />
            <SliderField label={t("generatorPanel.fields.gap")} value={params.gap} min={0} max={1} step={0.01} onChange={(v) => set("gap", v)} />
            <SliderField label={t("generatorPanel.fields.sidesRotation")} value={params.sidesRotation} min={-1.57} max={1.57} step={0.02} onChange={(v) => set("sidesRotation", v)} />
          </>
        )}

        {params.patternId === "lotus" && (
          <>
            <SliderField label={t("generatorPanel.fields.sides")} value={params.sides} min={5} max={64} onChange={(v) => set("sides", v)} />
            <SliderField label={t("generatorPanel.fields.density")} value={params.density} min={1} max={30} onChange={(v) => set("density", v)} />
            <SliderField label={t("generatorPanel.fields.rotation")} value={params.rotation} min={-3.15} max={3.15} step={0.05} onChange={(v) => set("rotation", v)} />
            <SliderField label={t("generatorPanel.fields.removeSections")} value={params.removeSections} min={0} max={1} step={0.02} onChange={(v) => set("removeSections", v)} />
            <CheckboxField
              label={t("generatorPanel.fields.renderCenter")}
              checked={params.renderCenter}
              onChange={(v) => setParams((p) => (p.patternId === "lotus" ? { ...p, renderCenter: v } : p))}
            />
            {params.renderCenter && (
              <SliderField label={t("generatorPanel.fields.centerRadius")} value={params.centerRadius} min={0} max={1} step={0.02} onChange={(v) => set("centerRadius", v)} />
            )}
            <CheckboxField
              label={t("generatorPanel.fields.radialColor")}
              checked={params.radialColor}
              onChange={(v) => setParams((p) => (p.patternId === "lotus" ? { ...p, radialColor: v } : p))}
            />
          </>
        )}
      </div>

      <fieldset className="generator-panel__colours-fieldset">
        <legend className="generator-panel__colours-legend">
          <span className="generator-panel__section-title">{t("generatorPanel.coloursSectionTitle")}</span>
          <span className="generator-panel__colour-actions">
            <button
              className="btn generator-panel__colour-action-btn"
              aria-label={t("generatorPanel.addColour")}
              disabled={visibleColours.length >= maxColours}
              onClick={addColour}
            >
              +
            </button>
            <button
              className="btn generator-panel__colour-action-btn"
              aria-label={t("generatorPanel.removeColour")}
              disabled={visibleColours.length <= 1}
              onClick={removeColour}
            >
              −
            </button>
          </span>
        </legend>
        <div className="generator-panel__swatches">
          {visibleColours.map((c, i) => (
            <input
              key={i}
              type="color"
              aria-label={t("generatorPanel.colourN", { n: i + 1 })}
              value={c}
              onChange={(e) => setColourAt(i, e.target.value)}
              className="generator-panel__swatch"
            />
          ))}
        </div>
        {maxColours > 1 && <div className="generator-panel__colours-note">{t("generatorPanel.coloursMax", { max: maxColours })}</div>}
      </fieldset>

      {/* docs/specs/32-generator-mode.md — intentionally shared with Thread mode's own
          width field (ThreadPropertiesPanel), not generator-scoped: generatePattern()
          always inherits threadDefaults.width unchanged, so editing it here is the same
          global default Thread mode edits, not a per-generation override. */}
      <SliderField
        label={t("generatorPanel.fields.threadWidth")}
        value={state.threadDefaults.width}
        min={0.5}
        max={5}
        step={0.5}
        onChange={(v) => store.setThreadProperty({ width: v })}
      />

      <div className="generator-panel__actions">
        {!draft && (
          <button className="btn btn-active generator-panel__action-btn" onClick={handleGenerateClick}>
            {t("generatorPanel.generate")}
          </button>
        )}
        {draft && (
          <>
            <div className="generator-panel__live-hint">{t("generatorPanel.liveHint")}</div>
            <button className="btn generator-panel__action-btn" onClick={() => store.confirmGeneratedPattern()}>
              {t("generatorPanel.confirm")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
