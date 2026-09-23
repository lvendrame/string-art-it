import "./Section.css";

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="print-preview-panel__section">
      <div className="print-preview-panel__section-heading">{title}</div>
      {children}
    </div>
  );
}
