import type { EditorMode } from "../../application/document";

const MODES: { id: EditorMode; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "pin", label: "Pin" },
  { id: "thread", label: "Thread" },
  { id: "pan", label: "Pan" },
];

export function ModeSwitcher({ mode, onChange }: { mode: EditorMode; onChange: (mode: EditorMode) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Editor mode"
      style={{
        display: "flex",
        background: "var(--bg-app)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: 3,
        gap: 2,
      }}
    >
      {MODES.map((m) => (
        <button
          key={m.id}
          role="tab"
          aria-selected={mode === m.id}
          className={`btn${mode === m.id ? " btn-active" : ""}`}
          onClick={() => onChange(m.id)}
          style={{
            border: "none",
            borderRadius: 8,
            padding: "7px 14px",
            fontSize: 12.5,
            fontWeight: 600,
            ...(mode === m.id ? {} : { background: "transparent", borderColor: "transparent" }),
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
