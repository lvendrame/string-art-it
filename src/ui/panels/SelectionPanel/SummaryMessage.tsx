import "./SummaryMessage.css";

export function SummaryMessage({ text }: { text: string }) {
  return <div className="selection-panel__summary-message">{text}</div>;
}
