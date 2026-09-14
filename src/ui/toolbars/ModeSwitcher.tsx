import { Hand, MousePointer2, Pin as PinIcon, Play, Spline } from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { EditorMode } from "../../application/document";

function modes(t: TFunction<["common", "toolbars"]>): { id: EditorMode; label: string; icon: ComponentType<{ size?: number }> }[] {
  return [
    { id: "select", label: t("modes.select", { ns: "common" }), icon: MousePointer2 },
    { id: "pin", label: t("modes.pin", { ns: "common" }), icon: PinIcon },
    { id: "thread", label: t("modes.thread", { ns: "common" }), icon: Spline },
    { id: "pan", label: t("modes.pan", { ns: "common" }), icon: Hand },
    { id: "play", label: t("modes.play", { ns: "common" }), icon: Play },
  ];
}

export function ModeSwitcher({ mode, onChange }: { mode: EditorMode; onChange: (mode: EditorMode) => void }) {
  const { t } = useTranslation(["toolbars", "common"]);
  const MODES = modes(t);
  return (
    <div
      role="tablist"
      aria-label={t("modeSwitcher.ariaLabel", { ns: "toolbars" })}
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
