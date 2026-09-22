import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { Board, BoardShape, EditorStore, TriangleType } from "../../application/document";
import { boardHypotenuse } from "../../application/document";
import { useEditorState } from "../useEditorStore";
import { isTextEntryTarget } from "../keyboard";
import { LanguageSwitcher, type LanguageSwitcherHandle } from "../LanguageSwitcher";
import { BoardAppearancePanel } from "./BoardAppearancePanel";
import "./BoardSetup.css";

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
    <label className="board-setup__field-label">
      {label}
      <input
        type="number"
        className="mono board-setup__field-input"
        value={value}
        min={0.1}
        step={0.1}
        onChange={(e) => onChange(Number(e.target.value))}
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
            <div className="mono board-setup__hypotenuse">{t("hypotenuse", { value: boardHypotenuse(board)?.toFixed(1) })}</div>
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
    <div className="board-setup">
      <div className="board-setup__header">
        <h2 className="board-setup__title">{t("title")}</h2>
        <LanguageSwitcher ref={languageSwitcherRef} />
      </div>

      <div className="board-setup__section">
        <div className="board-setup__section-title">{t("sections.shape")}</div>
        <div className="board-setup__shape-grid">
          {shapes.map((s) => (
            <button
              key={s.id}
              className={`btn board-setup__shape-btn${board.shape === s.id ? " btn-active" : ""}`}
              onClick={() => store.setBoardShape(s.id, s.id === "triangle" ? "equilateral" : undefined)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {board.shape === "triangle" && (
        <div className="board-setup__triangle-row">
          {(["equilateral", "right-angled"] as TriangleType[]).map((tri) => (
            <button
              key={tri}
              className={`btn board-setup__triangle-btn${board.triangleType === tri ? " btn-active" : ""}`}
              onClick={() => store.setTriangleType(tri)}
            >
              {t(tri === "equilateral" ? "triangleTypes.equilateral" : "triangleTypes.rightAngled")}
            </button>
          ))}
        </div>
      )}

      <div className="board-setup__section board-setup__section--wide-gap">
        <div className="board-setup__section-title">{t("sections.dimensions")}</div>
        <DimensionFields board={board} store={store} t={t} />
      </div>

      <BoardAppearancePanel store={store} />

      <button className="btn board-setup__continue-btn" onClick={onContinue}>
        {t("continueButton")}
      </button>
    </div>
  );
}
