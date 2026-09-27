// docs/specs/18-design-system.md — shared add/remove colour list, extracted out of
// GeneratorPanel.tsx once the Repeat tool's settings box also needed one (same "move
// out once a second panel needs it" precedent as CheckboxField/SliderField).
import { PALETTE } from "@ui/panels/threadColourPalette";
import "./ColourListField.css";

export interface ColourListLabels {
  title: string;
  add: string;
  remove: string;
  colourN: (n: number) => string;
  note?: string;
}

export function ColourListField({
  colours,
  max,
  onChange,
  labels,
  palette = PALETTE,
}: {
  colours: string[];
  max: number;
  onChange: (colours: string[]) => void;
  labels: ColourListLabels;
  palette?: string[];
}) {
  // Both buttons are disabled at their limits, so no extra bounds checks here.
  function addColour() {
    onChange([...colours, palette[colours.length % palette.length]]);
  }

  function removeColour() {
    onChange(colours.slice(0, -1));
  }

  function setColourAt(index: number, value: string) {
    onChange(colours.map((c, i) => (i === index ? value : c)));
  }

  return (
    <fieldset className="colour-list-field">
      <legend className="colour-list-field__legend">
        <span className="colour-list-field__title">{labels.title}</span>
        <span className="colour-list-field__actions">
          <button className="btn colour-list-field__action-btn" aria-label={labels.add} disabled={colours.length >= max} onClick={addColour}>
            +
          </button>
          <button className="btn colour-list-field__action-btn" aria-label={labels.remove} disabled={colours.length <= 1} onClick={removeColour}>
            −
          </button>
        </span>
      </legend>
      <div className="colour-list-field__swatches">
        {colours.map((c, i) => (
          <input
            key={i}
            type="color"
            aria-label={labels.colourN(i + 1)}
            value={c}
            onChange={(e) => setColourAt(i, e.target.value)}
            className="colour-list-field__swatch"
          />
        ))}
      </div>
      {labels.note && <div className="colour-list-field__note">{labels.note}</div>}
    </fieldset>
  );
}
