import "./ColourSwatch.css";

export function ColourSwatch({ colour }: { colour: string }) {
  return <span className="statistics-panel__swatch" style={{ background: colour }} />;
}
