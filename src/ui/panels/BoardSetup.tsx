import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { Board, BoardShape, EditorStore, TriangleType } from "../../application/document";
import { boardHypotenuse } from "../../application/document";
import { useEditorState } from "../useEditorStore";
import { isTextEntryTarget } from "../keyboard";
import { LanguageSwitcher, type LanguageSwitcherHandle } from "../LanguageSwitcher";
import { BoardAppearancePanel } from "./BoardAppearancePanel";

function shapeOptions(t: TFunction<"boardSetup">): { id: BoardShape; label: string }[] {
  return [
    { id: "circle", label: t("shapes.circle") },
    { id: "oval", label: t("shapes.oval") },
    { id: "rectangle", label: t("shapes.rectangle") },
    { id: "square", label: t("shapes.square") },
    { id: "triangle", label: t("shapes.triangle") },
  ];
}

function DimensionField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
      {label}
      <input
        type="number"
        className="mono"
        value={value}
        min={0.1}
        step={0.1}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: "var(--bg-app)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-primary)",
          padding: "6px 8px",
          fontSize: 13,
        }}
      />
    </label>
  );
}

function DimensionFields({ board, store, t }: { board: Board; store: EditorStore; t: TFunction<"boardSetup"> }) {
  const d = board.dimensions;
  switch (board.shape) {
    case "circle":
      return <DimensionField label={t("fields.diameter")} value={d.diameter ?? 60} onChange={(v) => store.setBoardDimensions({ diameter: v })} />;
    case "oval":
      return (
        <>
          <DimensionField label={t("fields.width")} value={d.width ?? 60} onChange={(v) => store.setBoardDimensions({ width: v })} />
          <DimensionField label={t("fields.height")} value={d.height ?? 40} onChange={(v) => store.setBoardDimensions({ height: v })} />
        </>
      );
    case "rectangle":
      return (
        <>
          <DimensionField label={t("fields.width")} value={d.width ?? 60} onChange={(v) => store.setBoardDimensions({ width: v })} />
          <DimensionField label={t("fields.height")} value={d.height ?? 40} onChange={(v) => store.setBoardDimensions({ height: v })} />
        </>
      );
    case "square":
      return <DimensionField label={t("fields.side")} value={d.side ?? 50} onChange={(v) => store.setBoardDimensions({ side: v })} />;
    case "triangle":
      if (board.triangleType === "right-angled") {
        return (
          <>
            <DimensionField label={t("fields.base")} value={d.base ?? 40} onChange={(v) => store.setBoardDimensions({ base: v })} />
            <DimensionField label={t("fields.height")} value={d.height ?? 30} onChange={(v) => store.setBoardDimensions({ height: v })} />
            <div className="mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {t("hypotenuse", { value: boardHypotenuse(board)?.toFixed(1) })}
            </div>
          </>
        );
      }
      return <DimensionField label={t("fields.side")} value={d.side ?? 50} onChange={(v) => store.setBoardDimensions({ side: v })} />;
  }
}

export function BoardSetup({ store, onContinue }: { store: EditorStore; onContinue: () => void }) {
  const { t } = useTranslation("boardSetup");
  const state = useEditorState(store);
  const { board } = state;
  const shapes = shapeOptions(t);
  const languageSwitcherRef = useRef<LanguageSwitcherHandle>(null);

  // docs/specs/34-keyboard-shortcuts.md — this screen's own shortcuts (Enter to
  // continue, L to open/cycle language), scoped to its own lifecycle rather than
  // routed through EditorShell's dispatcher, matching LanguageSwitcher's own
  // pre-existing self-contained Escape listener.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTextEntryTarget(e.target)) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onContinue();
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        languageSwitcherRef.current?.openOrCycle();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onContinue]);

  return (
    <div
      style={{
        maxWidth: 420,
        margin: "80px auto",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: 24,
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{t("title")}</h2>
        <LanguageSwitcher ref={languageSwitcherRef} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
          {t("sections.shape")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {shapes.map((s) => (
            <button
              key={s.id}
              className={`btn${board.shape === s.id ? " btn-active" : ""}`}
              onClick={() => store.setBoardShape(s.id, s.id === "triangle" ? "equilateral" : undefined)}
              style={{ justifyContent: "center", borderRadius: "var(--radius-sm)", padding: "10px 4px", fontSize: 12, fontWeight: 600 }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {board.shape === "triangle" && (
        <div style={{ display: "flex", gap: 6 }}>
          {(["equilateral", "right-angled"] as TriangleType[]).map((tri) => (
            <button
              key={tri}
              className={`btn${board.triangleType === tri ? " btn-active" : ""}`}
              onClick={() => store.setTriangleType(tri)}
              style={{ flex: 1, justifyContent: "center", borderRadius: "var(--radius-sm)", padding: 9, fontSize: 12, fontWeight: 600 }}
            >
              {t(tri === "equilateral" ? "triangleTypes.equilateral" : "triangleTypes.rightAngled")}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
          {t("sections.dimensions")}
        </div>
        <DimensionFields board={board} store={store} t={t} />
      </div>

      <BoardAppearancePanel store={store} />

      <button
        className="btn"
        onClick={onContinue}
        style={{
          justifyContent: "center",
          borderRadius: "var(--radius-sm)",
          padding: 10,
          fontSize: 13,
          fontWeight: 700,
          background: "var(--accent-strong)",
          color: "white",
          borderColor: "transparent",
        }}
      >
        {t("continueButton")}
      </button>
    </div>
  );
}
