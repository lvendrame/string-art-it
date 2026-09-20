import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { EditorStore, recomputePinPath, rotateGeometry, scaleGeometry, translateGeometry } from "./application/document";
import { fitViewportForBoard } from "./ui/canvas/boardViewport";
import { CookieConsentBanner } from "./ui/CookieConsentBanner";
import { EditorShell } from "./ui/EditorShell";
import { LandingFAQ } from "./ui/panels/landing/LandingFAQ";
import { LandingFeatures } from "./ui/panels/landing/LandingFeatures";
import { LandingHero } from "./ui/panels/landing/LandingHero";
import { LandingHowItWorks } from "./ui/panels/landing/LandingHowItWorks";
import { BoardSetup } from "./ui/panels/BoardSetup";
import { useAutosave } from "./ui/useAutosave";
import { registerWebMcpTools } from "./infrastructure/webmcp/tools";

// Unstable debug/test hook — no compat guarantee, not part of the app's public
// surface. Lets Playwright (or anyone in the console) drive the document directly via
// EditorStore's own methods instead of simulating pixel-accurate mouse gestures for
// every setup step. `Helpers` carries the pure geometry-transform functions the
// Edit-mode tools (Move/Rotation/Scale) use to build their commit arguments, since
// those are plain module exports otherwise unreachable from a page.evaluate() call.
// See .claude/skills/test-with-debug-hook/SKILL.md.
declare global {
  interface Window {
    stringArtItDebug?: EditorStore;
    stringArtItDebugHelpers?: {
      scaleGeometry: typeof scaleGeometry;
      rotateGeometry: typeof rotateGeometry;
      translateGeometry: typeof translateGeometry;
      recomputePinPath: typeof recomputePinPath;
    };
  }
}

export function App() {
  const { t } = useTranslation("common");
  const store = useMemo(() => new EditorStore(), []);
  useEffect(() => {
    window.stringArtItDebug = store;
    window.stringArtItDebugHelpers = { scaleGeometry, rotateGeometry, translateGeometry, recomputePinPath };
  }, [store]);
  // docs/specs/31-webmcp-agent-tools.md — a separate, genuinely public/stable-contract
  // surface from the debug hook above; feature-detected, a no-op in every browser that
  // doesn't implement navigator.modelContext yet.
  useEffect(() => registerWebMcpTools(store), [store]);
  const [entered, setEntered] = useState(false);
  const { pendingAutosave, restore, discard } = useAutosave(store);

  function enterEditor() {
    store.setViewport(fitViewportForBoard(store.getState().board));
    setEntered(true);
  }

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
          <span>{t("autosave.found")}</span>
          <button
            className="btn"
            onClick={() => { restore(); enterEditor(); }}
            style={{ borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, background: "var(--accent-strong)", color: "white", borderColor: "transparent" }}
          >
            {t("autosave.restore")}
          </button>
          <button className="btn" onClick={discard} style={{ borderRadius: 6, padding: "5px 10px", fontSize: 12 }}>
            {t("autosave.discard")}
          </button>
        </div>
      )}

      <main>
        {entered ? (
          <EditorShell store={store} onNewProject={() => setEntered(false)} />
        ) : (
          <>
            <LandingHero />
            <BoardSetup store={store} onContinue={() => { store.setMode("pin"); enterEditor(); }} />
            <LandingFeatures />
            <LandingHowItWorks />
            <LandingFAQ />
          </>
        )}
      </main>

      <CookieConsentBanner />
    </>
  );
}
