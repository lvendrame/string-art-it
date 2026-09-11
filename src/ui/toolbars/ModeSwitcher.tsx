import { Hand, MousePointer2, Pin as PinIcon, Spline } from "lucide-react";
import type { ComponentType } from "react";
import type { EditorMode } from "../../application/document";

const MODES: { id: EditorMode; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: "select", label: "Edit", icon: MousePointer2 },
  { id: "pin", label: "Pin", icon: PinIcon },
  { id: "thread", label: "Thread", icon: Spline },
  { id: "pan", label: "Pan", icon: Hand },
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
            gap: 6,
            ...(mode === m.id ? {} : { background: "transparent", borderColor: "transparent" }),
          }}
        >
          <m.icon size={14} />
          {m.label}
        </button>
      ))}
    </div>
  );
}
