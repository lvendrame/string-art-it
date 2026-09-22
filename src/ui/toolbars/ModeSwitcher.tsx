import { Hand, MousePointer2, Pin as PinIcon, Play, Spline, Wand2 } from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { EditorMode } from "../../application/document";
import "./ModeSwitcher.css";

function modes(t: TFunction<["common", "toolbars"]>): { id: EditorMode; label: string; icon: ComponentType<{ size?: number }> }[] {
  return [
    { id: "select", label: t("modes.select", { ns: "common" }), icon: MousePointer2 },
    { id: "pin", label: t("modes.pin", { ns: "common" }), icon: PinIcon },
    { id: "thread", label: t("modes.thread", { ns: "common" }), icon: Spline },
    { id: "generate", label: t("modes.generate", { ns: "common" }), icon: Wand2 },
    { id: "pan", label: t("modes.pan", { ns: "common" }), icon: Hand },
    { id: "play", label: t("modes.play", { ns: "common" }), icon: Play },
  ];
}

export function ModeSwitcher({ mode, onChange }: { mode: EditorMode; onChange: (mode: EditorMode) => void }) {
  const { t } = useTranslation(["toolbars", "common"]);
  const MODES = modes(t);
  return (
    <div role="tablist" aria-label={t("modeSwitcher.ariaLabel", { ns: "toolbars" })} className="mode-switcher">
      {MODES.map((m) => (
        <button
          key={m.id}
          role="tab"
          aria-selected={mode === m.id}
          className={`btn mode-switcher__tab${mode === m.id ? " btn-active" : ""}`}
          onClick={() => onChange(m.id)}
        >
          <m.icon size={14} />
          {m.label}
        </button>
      ))}
    </div>
  );
}
