import type { Grid3x3 } from "lucide-react";
import "./ToggleChip.css";

export const CANVAS_TOOLBAR_TOOLTIP_ID = "canvas-toolbar-tooltip";

export function ToggleChip({ label, active, onClick, icon: Icon }: { label: string; active: boolean; onClick: () => void; icon: typeof Grid3x3 }) {
  return (
    <button
      className={`btn canvas-toolbar__chip${active ? " btn-active" : ""}`}
      onClick={onClick}
      aria-label={label}
      data-tooltip-id={CANVAS_TOOLBAR_TOOLTIP_ID}
      data-tooltip-content={label}
    >
      <Icon size={14} />
    </button>
  );
}
