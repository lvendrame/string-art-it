import type { Board, BoardShape, EditorStore, TriangleType } from "../../application/document";
import { boardHypotenuse } from "../../application/document";
import { useEditorState } from "../useEditorStore";
import { BoardAppearancePanel } from "./BoardAppearancePanel";

const SHAPES: { id: BoardShape; label: string }[] = [
  { id: "circle", label: "Circle" },
  { id: "oval", label: "Oval" },
  { id: "rectangle", label: "Rectangle" },
  { id: "square", label: "Square" },
  { id: "triangle", label: "Triangle" },
];

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

function DimensionFields({ board, store }: { board: Board; store: EditorStore }) {
  const d = board.dimensions;
  switch (board.shape) {
    case "circle":
      return <DimensionField label="Diameter (cm)" value={d.diameter ?? 60} onChange={(v) => store.setBoardDimensions({ diameter: v })} />;
    case "oval":
      return (
        <>
          <DimensionField label="Width (cm)" value={d.width ?? 60} onChange={(v) => store.setBoardDimensions({ width: v })} />
          <DimensionField label="Height (cm)" value={d.height ?? 40} onChange={(v) => store.setBoardDimensions({ height: v })} />
        </>
      );
    case "rectangle":
      return (
        <>
          <DimensionField label="Width (cm)" value={d.width ?? 60} onChange={(v) => store.setBoardDimensions({ width: v })} />
          <DimensionField label="Height (cm)" value={d.height ?? 40} onChange={(v) => store.setBoardDimensions({ height: v })} />
        </>
      );
    case "square":
      return <DimensionField label="Side (cm)" value={d.side ?? 50} onChange={(v) => store.setBoardDimensions({ side: v })} />;
    case "triangle":
      if (board.triangleType === "right-angled") {
        return (
          <>
            <DimensionField label="Base (cm)" value={d.base ?? 40} onChange={(v) => store.setBoardDimensions({ base: v })} />
            <DimensionField label="Height (cm)" value={d.height ?? 30} onChange={(v) => store.setBoardDimensions({ height: v })} />
            <div className="mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Hypotenuse: {boardHypotenuse(board)?.toFixed(1)} cm
            </div>
          </>
        );
      }
      return <DimensionField label="Side (cm)" value={d.side ?? 50} onChange={(v) => store.setBoardDimensions({ side: v })} />;
  }
}

export function BoardSetup({ store, onContinue }: { store: EditorStore; onContinue: () => void }) {
  const state = useEditorState(store);
  const { board } = state;

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
      <h1 style={{ margin: 0, fontSize: 18 }}>New Board</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
          Shape
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {SHAPES.map((s) => (
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
          {(["equilateral", "right-angled"] as TriangleType[]).map((t) => (
            <button
              key={t}
              className={`btn${board.triangleType === t ? " btn-active" : ""}`}
              onClick={() => store.setTriangleType(t)}
              style={{ flex: 1, justifyContent: "center", borderRadius: "var(--radius-sm)", padding: 9, fontSize: 12, fontWeight: 600 }}
            >
              {t === "equilateral" ? "Equilateral" : "Right-angled"}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
          Dimensions
        </div>
        <DimensionFields board={board} store={store} />
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
          background: "var(--accent)",
          color: "white",
          borderColor: "transparent",
        }}
      >
        Continue to Editor
      </button>
    </div>
  );
}
