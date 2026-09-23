import type { ReactNode } from "react";
import "./StatCard.css";

export function StatCard({ title, rows }: { title: ReactNode; rows: [string, ReactNode][] }) {
  return (
    <div className="statistics-panel__card">
      <div className="statistics-panel__card-title">{title}</div>
      {rows.map(([label, value]) => (
        <div key={label} className="mono statistics-panel__card-row">
          <span className="statistics-panel__card-row-label">{label}</span>
          <span className="statistics-panel__card-row-value">{value}</span>
        </div>
      ))}
    </div>
  );
}
