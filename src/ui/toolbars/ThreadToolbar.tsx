import type { EditorStore } from "../../application/document";
import { useEditorState } from "../useEditorStore";

const PALETTE = ["#5b8def", "#edeff7", "#e8b449", "#d96c6c", "#8fd6c8"];

// docs/specs/24-thread-mode + 25-thread-colour-rendering
export function ThreadToolbar({ store }: { store: EditorStore }) {
  const state = useEditorState(store);
  const colours = state.threadDefaults.colours;

  function setColourCount(n: number) {
    const next = Array.from({ length: n }, (_, i) => colours[i] ?? PALETTE[i % PALETTE.length]);
    store.setThreadDefaults({ colours: next });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        Thread
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className={`btn${state.threadTool === "draw" ? " btn-active" : ""}`} onClick={() => store.setThreadTool("draw")} style={{ flex: 1, justifyContent: "center", borderRadius: "var(--radius-sm)", padding: 9, fontSize: 12, fontWeight: 600 }}>
          Draw
        </button>
        <button className={`btn${state.threadTool === "eraser" ? " btn-active" : ""}`} onClick={() => store.setThreadTool("eraser")} style={{ flex: 1, justifyContent: "center", borderRadius: "var(--radius-sm)", padding: 9, fontSize: 12, fontWeight: 600 }}>
          Eraser
        </button>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase", marginTop: 4 }}>
        Colours
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            className={`btn${colours.length === n ? " btn-active" : ""}`}
            onClick={() => setColourCount(n)}
            style={{ flex: 1, justifyContent: "center", borderRadius: "var(--radius-sm)", padding: 9, fontSize: 12, fontWeight: 700 }}
          >
            {n}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {colours.map((c, i) => (
          <input
            key={i}
            type="color"
            value={c}
            onChange={(e) => store.setThreadDefaults({ colours: colours.map((existing, idx) => (idx === i ? e.target.value : existing)) })}
            style={{ width: 24, height: 24, border: "1px solid var(--border-strong)", borderRadius: 5, background: "none", padding: 0 }}
          />
        ))}
      </div>

      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
        Width
        <input
          type="number"
          className="mono"
          min={0.5}
          step={0.5}
          value={state.threadDefaults.width}
          onChange={(e) => store.setThreadDefaults({ width: Number(e.target.value) })}
          style={{ width: 60, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "4px 6px" }}
        />
      </label>

      {colours.length > 1 && (
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
          Twist pitch
          <input
            type="number"
            className="mono"
            min={2}
            max={20}
            step={1}
            value={state.threadDefaults.twistPitch}
            onChange={(e) => store.setThreadDefaults({ twistPitch: Number(e.target.value) })}
            style={{ width: 60, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "4px 6px" }}
          />
        </label>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 12px", marginTop: 4 }}>
        <PinStateLegend swatch={<span style={{ width: 10, height: 10, borderRadius: "50%", background: "#c7cad3", display: "inline-block" }} />} label="Normal" />
        <PinStateLegend
          swatch={
            <span style={{ position: "relative", width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid #e8b449" }} />
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e8b449" }} />
            </span>
          }
          label="Nearest candidate"
        />
        <PinStateLegend swatch={<span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />} label="Active origin" />
      </div>
    </div>
  );
}

function PinStateLegend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      {swatch}
      <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{label}</span>
    </div>
  );
}
