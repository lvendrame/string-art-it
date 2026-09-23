import type { EditorStore, SelectGranularity } from "../../../application/document";
import "./GranularitySwitch.css";

// docs/specs/26-edit-mode-multi-select.md, docs/specs/18-design-system.md §Labeled
// slide switch — a track+knob control flanked by two clickable end labels, for a
// mutually-exclusive 2-way choice the user explicitly wants rendered as a literal
// switch rather than the Segmented mode switcher pattern (which reads as tabs, not a
// toggle). Track visual size (40x20) stays inside a 44x32 hit target per
// 18-design-system.md's 32px minimum interactive size — the extra hit area is
// invisible padding, same convention icon buttons already use.
export function GranularitySwitch({ store, granularity, label }: { store: EditorStore; granularity: SelectGranularity; label: (g: SelectGranularity) => string }) {
  const isPins = granularity === "pins";
  return (
    <div className="select-toolbar__granularity">
      <button
        onClick={() => store.setSelectGranularity("path")}
        className={`select-toolbar__granularity-label${isPins ? "" : " select-toolbar__granularity-label--active"}`}
      >
        {label("path")}
      </button>
      <button
        role="switch"
        aria-checked={isPins}
        aria-label={label("path") + " / " + label("pins") + " [Shift+P]"}
        onClick={() => store.setSelectGranularity(isPins ? "path" : "pins")}
        className="select-toolbar__switch"
      >
        <span aria-hidden className="select-toolbar__track" />
        <span aria-hidden className={`select-toolbar__knob${isPins ? " select-toolbar__knob--pins" : ""}`} />
      </button>
      <button
        onClick={() => store.setSelectGranularity("pins")}
        className={`select-toolbar__granularity-label${isPins ? " select-toolbar__granularity-label--active" : ""}`}
      >
        {label("pins")}
      </button>
    </div>
  );
}
