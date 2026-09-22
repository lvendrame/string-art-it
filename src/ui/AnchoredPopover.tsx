import type { HTMLAttributes, ReactNode } from "react";
import "./AnchoredPopover.css";

export interface AnchoredPopoverProps extends HTMLAttributes<HTMLDivElement> {
  align: "left" | "right";
  /** "panel-2" is the lighter tone used by option-list popovers (LanguageSwitcher,
   * ZoomControl); "panel" (default) is used by settings/menu popovers. */
  variant?: "panel" | "panel-2";
  children: ReactNode;
}

// docs/conventions/ui-patterns.md §Anchored settings popover — the shared panel shell
// (position, background, border, radius, elevation) for ExportMenu.tsx,
// LanguageSwitcher.tsx, GridSettingsPopover.tsx, ChangeBackgroundPopover.tsx, and
// ZoomControl.tsx. Each consumer keeps its own trigger and panel content; this only
// replaces the near-identical inline style object each one used to declare
// separately. Render only while `open` is true — same as before extraction.
export function AnchoredPopover({ align, variant = "panel", className, children, ...rest }: AnchoredPopoverProps) {
  const classes = ["popover-panel", `popover-panel--${align}`, variant === "panel-2" ? "popover-panel--alt" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
