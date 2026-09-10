import { useMemo, useState } from "react";
import { EditorStore } from "./application/document";
import { EditorShell } from "./ui/EditorShell";
import { BoardSetup } from "./ui/panels/BoardSetup";
import { useAutosave } from "./ui/useAutosave";

export function App() {
  const store = useMemo(() => new EditorStore(), []);
  const [entered, setEntered] = useState(false);
  const { pendingAutosave, restore, discard } = useAutosave(store);

  return (
    <>
      {pendingAutosave && (
        <div
          style={{
            position: "fixed",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--bg-panel)",
            border: "1px solid var(--accent)",
            borderRadius: "var(--radius-md)",
            padding: "10px 16px",
            fontSize: 12.5,
            color: "var(--text-primary)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          <span>An autosaved project was found.</span>
          <button
            className="btn"
            onClick={() => { restore(); setEntered(true); }}
            style={{ borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, background: "var(--accent)", color: "white", borderColor: "transparent" }}
          >
            Restore
          </button>
          <button className="btn" onClick={discard} style={{ borderRadius: 6, padding: "5px 10px", fontSize: 12 }}>
            Discard
          </button>
        </div>
      )}

      {entered ? (
        <EditorShell store={store} onNewProject={() => setEntered(false)} />
      ) : (
        <BoardSetup store={store} onContinue={() => setEntered(true)} />
      )}
    </>
  );
}
