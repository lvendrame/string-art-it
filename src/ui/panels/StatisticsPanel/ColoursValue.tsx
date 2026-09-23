import { ColourSwatch } from "./ColourSwatch";
import "./ColoursValue.css";

export function ColoursValue({ colours }: { colours: string[] }) {
  return (
    <span className="statistics-panel__colours">
      {colours.map((colour, i) => (
        <span key={i} className="statistics-panel__colour-item">
          <ColourSwatch colour={colour} />
          {colour}
        </span>
      ))}
    </span>
  );
}
