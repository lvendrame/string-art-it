import { useEffect, useMemo, useState } from "react";
import { EditorStore, recomputePinPath, rotateGeometry, scaleGeometry, translateGeometry } from "./application/document";
import { fitViewportForBoard } from "./ui/canvas/boardViewport";
import { CookieConsentBanner } from "./ui/CookieConsentBanner";
import { EditorShell } from "./ui/EditorShell";
import { LandingFAQ } from "./ui/panels/landing/LandingFAQ";
import { LandingFeatures } from "./ui/panels/landing/LandingFeatures";
import { LandingHero } from "./ui/panels/landing/LandingHero";
import { LandingHowItWorks } from "./ui/panels/landing/LandingHowItWorks";
import { AutosaveDialog } from "./ui/panels/landing/AutosaveDialog";
import { BoardSetup } from "./ui/panels/BoardSetup/BoardSetup";
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
      {!entered && pendingAutosave && (
        <AutosaveDialog onRestore={() => { restore(); enterEditor(); }} onDiscard={discard} />
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
