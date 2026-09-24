import type { Plus } from "lucide-react";
import "./IconActionButton.css";

export const LAYERS_TOOLTIP_ID = "layers-panel-actions-tooltip";

// Icon-only so the 6-button row always fits the fixed-width side panel — the full
// label still reaches assistive tech via aria-label and sighted users via the
// react-tooltip hover/focus tooltip (docs/specs/13-layers.md action bar).
export function IconActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      className={`btn layers-panel__action-btn${danger ? " layers-panel__action-btn--danger" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-tooltip-id={LAYERS_TOOLTIP_ID}
      data-tooltip-content={label}
    >
      <Icon size={15} />
    </button>
  );
}
