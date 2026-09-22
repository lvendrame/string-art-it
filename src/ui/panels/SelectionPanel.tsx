import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { pinPathStatistics, type EditorStore, type PinPathGeometry } from "../../application/document";
import { FONT_CATALOG, getFontCatalogEntry, type FontWeight } from "../../infrastructure/fonts/fontCatalog";
import { buildTextGeometry } from "../text/buildTextGeometry";
import { useEditorState } from "../useEditorStore";
import { SymmetryPanel } from "./SymmetryPanel";
import "./SelectionPanel.css";

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="selection-panel__row">
      {label}
      <input
        type="number"
        className="mono selection-panel__number-input"
        step={0.1}
        value={Number(value.toFixed(3))}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function SummaryMessage({ text }: { text: string }) {
  return <div className="selection-panel__summary-message">{text}</div>;
}

// docs/specs/17-statistics.md — same Pins/Actual-gap/Perimeter figures the Statistics
// overlay's per-path card shows, surfaced inline whenever one or more Pin Paths are
// selected in Edit mode. `actualGapCm` is omitted for a multi-path selection (2+ paths
// can have different actual spacing, so no single "Actual gap" value is unambiguous —
// Pins and Perimeter still sum cleanly across the whole selection).
function PinPathStatsBox({ pins, actualGapCm, perimeterCm }: { pins: number; actualGapCm?: number; perimeterCm: number }) {
  const { t } = useTranslation("panels");
  const rows: [string, string][] = [
    [t("selectionPanel.stats.pins"), String(pins)],
    ...(actualGapCm !== undefined ? ([[t("selectionPanel.stats.actualGap"), `${actualGapCm.toFixed(2)} cm`]] as [string, string][]) : []),
    [t("selectionPanel.stats.perimeter"), `${perimeterCm.toFixed(2)} cm`],
  ];

  return (
    <div className="selection-panel__stats-box">
      <div className="selection-panel__section-title">{t("selectionPanel.stats.title")}</div>
      {rows.map(([label, value]) => (
        <div key={label} className="mono selection-panel__stats-row">
          <span className="selection-panel__stats-label">{label}</span>
          <span className="selection-panel__stats-value">{value}</span>
        </div>
      ))}
    </div>
  );
}

// docs/specs/09-selection-and-editing.md, docs/specs/26-edit-mode-multi-select.md —
// editable geometry fields per shape when exactly one Pin Path is selected. Editing
// any field recalculates pins via store.updatePinPathGeometry. A multi-path or
// pins-granularity selection shows a summary only — no per-shape fields, no delete
// action (multi-selection delete isn't part of this pass, a known scope gap per
// docs/specs/26-edit-mode-multi-select.md).
export function SelectionPanel({ store }: { store: EditorStore }) {
  const { t } = useTranslation("panels");
  const state = useEditorState(store);
  const textInputRef = useRef<HTMLInputElement>(null);

  // docs/specs/29-text-pin-path.md — focus the Text field the moment a Text Pin Path
  // becomes selected (this fires exactly once per selection change, not per keystroke,
  // since `state.selection` only gets a new reference from an explicit store.select()
  // call — geometry edits from typing go through updatePinPathGeometry instead and
  // never touch it). This is what the Text tool's placement click relies on: it selects
  // the freshly-created empty path via the same generic addPinPath -> setMode("select")
  // + select() flow every pin tool already gets, and this effect turns that selection
  // change into "the Text field is ready to type into" with no extra click.
  useEffect(() => {
    if (state.selection.type !== "pinPaths" || state.selection.refs.length !== 1) return;
    if (store.getSelectedPinPath()?.geometry.type !== "text") return;
    textInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the selection identity, not the store (a stable ref)
  }, [state.selection]);

  if (state.selection.type === "pins") {
    const paths = new Set(state.selection.refs.map((r) => r.pathId));
    return <SummaryMessage text={t("selectionPanel.multiPinsSelected", { count: state.selection.refs.length, paths: paths.size })} />;
  }

  if (state.selection.type !== "pinPaths") {
    return <div className="selection-panel__empty-message">{t("selectionPanel.emptyMessage")}</div>;
  }

  if (state.selection.refs.length > 1) {
    const selectedPaths = store.getSelectedPinPaths();
    const totalPerimeter = selectedPaths.reduce((sum, p) => sum + pinPathStatistics(p).perimeterCm, 0);
    const totalPins = selectedPaths.reduce((sum, p) => sum + p.pins.length, 0);
    return (
      <div className="selection-panel__multi-wrap">
        <SummaryMessage text={t("selectionPanel.multiPathsSelected", { count: state.selection.refs.length })} />
        <PinPathStatsBox pins={totalPins} perimeterCm={totalPerimeter} />
      </div>
    );
  }

  const selected = store.getSelectedPinPath();
  if (!selected) return null;
  const { layerId, pathId } = state.selection.refs[0];
  const g = selected.geometry;
  const stats = pinPathStatistics(selected);

  const set = (next: PinPathGeometry) => store.updatePinPathGeometry(layerId, pathId, next);
  const f = (key: string) => t(`selectionPanel.fields.${key}`);

  // docs/specs/29-text-pin-path.md — the only async field-edit path in this panel:
  // Font/Weight/Italic/Size/LetterSpacing/Text-content all regenerate the contours from
  // the (possibly newly loaded) font before committing. `ensureFontLoaded` inside
  // buildTextGeometry is memoized, so re-typing text against an already-loaded font
  // resolves instantly (no real network wait) — only switching to a font/weight/italic
  // combination that hasn't been fetched yet pays that cost.
  const setText = (patch: Partial<{ text: string; fontId: string; weight: FontWeight; italic: boolean; size: number; letterSpacing: number }>) => {
    if (g.type !== "text") return;
    const next = { ...g, ...patch };
    void buildTextGeometry(next.origin, next.text, next.fontId, next.weight, next.italic, next.size, next.letterSpacing).then(set);
  };

  return (
    <div className="selection-panel">
      <div className="selection-panel__section-title">{t("selectionPanel.title", { type: t(`selectionPanel.shapeTypes.${g.type}`) })}</div>
      <div className="selection-panel__box">
        <NumberField
          label={t("selectionPanel.pinDistance")}
          value={selected.requestedSpacing}
          onChange={(v) => store.setPinProperty({ spacing: Math.max(v, 0.01) })}
        />
        {g.type === "line" && (
          <>
            <NumberField label={f("startX")} value={g.start.x} onChange={(v) => set({ ...g, start: { ...g.start, x: v } })} />
            <NumberField label={f("startY")} value={g.start.y} onChange={(v) => set({ ...g, start: { ...g.start, y: v } })} />
            <NumberField label={f("endX")} value={g.end.x} onChange={(v) => set({ ...g, end: { ...g.end, x: v } })} />
            <NumberField label={f("endY")} value={g.end.y} onChange={(v) => set({ ...g, end: { ...g.end, y: v } })} />
          </>
        )}
        {g.type === "circle" && (
          <>
            <NumberField label={f("centreX")} value={g.center.x} onChange={(v) => set({ ...g, center: { ...g.center, x: v } })} />
            <NumberField label={f("centreY")} value={g.center.y} onChange={(v) => set({ ...g, center: { ...g.center, y: v } })} />
            <NumberField label={f("radius")} value={g.radius} onChange={(v) => set({ ...g, radius: Math.max(v, 0.01) })} />
          </>
        )}
        {g.type === "ellipse" && (
          <>
            <NumberField label={f("centreX")} value={g.center.x} onChange={(v) => set({ ...g, center: { ...g.center, x: v } })} />
            <NumberField label={f("centreY")} value={g.center.y} onChange={(v) => set({ ...g, center: { ...g.center, y: v } })} />
            <NumberField label={f("radiusX")} value={g.radiusX} onChange={(v) => set({ ...g, radiusX: Math.max(v, 0.01) })} />
            <NumberField label={f("radiusY")} value={g.radiusY} onChange={(v) => set({ ...g, radiusY: Math.max(v, 0.01) })} />
            <NumberField label={f("rotation")} value={g.rotation} onChange={(v) => set({ ...g, rotation: v })} />
          </>
        )}
        {(g.type === "rectangle" || g.type === "square") && (
          <>
            <NumberField label={f("positionX")} value={g.position.x} onChange={(v) => set({ ...g, position: { ...g.position, x: v } })} />
            <NumberField label={f("positionY")} value={g.position.y} onChange={(v) => set({ ...g, position: { ...g.position, y: v } })} />
            {g.type === "rectangle" ? (
              <>
                <NumberField label={f("width")} value={g.width} onChange={(v) => set({ ...g, width: Math.max(v, 0.01) })} />
                <NumberField label={f("height")} value={g.height} onChange={(v) => set({ ...g, height: Math.max(v, 0.01) })} />
              </>
            ) : (
              <NumberField label={f("side")} value={g.side} onChange={(v) => set({ ...g, side: Math.max(v, 0.01) })} />
            )}
            <NumberField label={f("rotation")} value={g.rotation} onChange={(v) => set({ ...g, rotation: v })} />
          </>
        )}
        {(g.type === "regular-polygon" || g.type === "star" || g.type === "polygram") && (
          <>
            <NumberField label={f("centreX")} value={g.center.x} onChange={(v) => set({ ...g, center: { ...g.center, x: v } })} />
            <NumberField label={f("centreY")} value={g.center.y} onChange={(v) => set({ ...g, center: { ...g.center, y: v } })} />
            <NumberField label={f("rotation")} value={g.rotation} onChange={(v) => set({ ...g, rotation: v })} />
            {g.type === "regular-polygon" && <NumberField label={f("radius")} value={g.radius} onChange={(v) => set({ ...g, radius: Math.max(v, 0.01) })} />}
            {g.type === "star" && (
              <>
                <NumberField label={f("outerRadius")} value={g.outerRadius} onChange={(v) => set({ ...g, outerRadius: Math.max(v, 0.01) })} />
                <NumberField label={f("innerRadius")} value={g.innerRadius} onChange={(v) => set({ ...g, innerRadius: Math.max(v, 0.01) })} />
              </>
            )}
            {g.type === "polygram" && <NumberField label={f("radius")} value={g.radius} onChange={(v) => set({ ...g, radius: Math.max(v, 0.01) })} />}
          </>
        )}
        {g.type === "text" && (
          <>
            <label className="selection-panel__row">
              {f("text")}
              <input
                ref={textInputRef}
                type="text"
                value={g.text}
                onChange={(e) => setText({ text: e.target.value })}
                className="selection-panel__text-input"
              />
            </label>
            <label className="selection-panel__row">
              {f("font")}
              <select value={g.fontId} onChange={(e) => setText({ fontId: e.target.value })} className="selection-panel__select">
                {FONT_CATALOG.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.family}
                  </option>
                ))}
              </select>
            </label>
            <label className="selection-panel__row">
              {f("weight")}
              <select value={g.weight} onChange={(e) => setText({ weight: e.target.value as FontWeight })} className="selection-panel__select">
                {(getFontCatalogEntry(g.fontId)?.weights ?? ["regular"]).map((weight) => (
                  <option key={weight} value={weight}>
                    {t(`selectionPanel.weightOptions.${weight}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="selection-panel__row">
              {f("italic")}
              <input
                type="checkbox"
                checked={g.italic}
                disabled={!getFontCatalogEntry(g.fontId)?.hasItalic}
                onChange={(e) => setText({ italic: e.target.checked })}
              />
            </label>
            <NumberField label={f("size")} value={g.size} onChange={(v) => setText({ size: Math.max(v, 0.1) })} />
            <NumberField label={f("letterSpacing")} value={g.letterSpacing} onChange={(v) => setText({ letterSpacing: v })} />
          </>
        )}
      </div>
      <SymmetryPanel store={store} />
      <PinPathStatsBox pins={stats.pins} actualGapCm={stats.actualSpacing} perimeterCm={stats.perimeterCm} />
      <button className="btn selection-panel__delete-btn" onClick={() => store.deletePinPath(layerId, pathId)}>
        {t("selectionPanel.deletePinPath")}
      </button>
    </div>
  );
}
