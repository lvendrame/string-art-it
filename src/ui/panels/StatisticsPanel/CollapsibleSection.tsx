import type { ReactNode } from "react";
import "./CollapsibleSection.css";

export function CollapsibleSection({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="statistics-panel__section">
      <summary className="statistics-panel__section-summary">{title}</summary>
      <div className="statistics-panel__section-grid">{children}</div>
    </details>
  );
}
