import type { PinPath, ThreadPath } from "@application/document";
import { PinPathVisual } from "./PinPathVisual";
import { ThreadPathVisual } from "./ThreadPathVisual";

// docs/specs/32-generator-mode.md — renders an uncommitted Generate/Re-generate result.
// The draft's Pin/Thread Paths are real objects (same PinPath/ThreadPath shape as any
// committed layer), so this reuses PinPathVisual/ThreadPathVisual as-is rather than
// inventing new SVG rendering — wrapped in a reduced-opacity group so a draft always
// reads as "not yet part of the document" even though it's rendered on top of every
// real layer, same visual-distinction goal as the app's other in-progress-draft overlay
// (ThreadDraftLayer), just achieved with opacity instead of a dashed preview stroke
// since a generated pattern can be a full multi-path composite, not a single line.
export function GeneratorPreviewOverlay({ pinPaths, threadPaths }: { pinPaths: PinPath[]; threadPaths: ThreadPath[] }) {
  // ThreadPathVisual resolves pin positions via findPinById(pinLayers, id), which just
  // scans whatever layers it's given — the draft's pins live in `pinPaths` directly,
  // never in a real PinLayer, so a single throwaway wrapper layer is enough to reuse it.
  const draftPinLayers = [{ id: "generator-draft", name: "", visible: true, locked: false, pinPaths }];

  return (
    <g opacity={0.6} data-testid="generator-preview">
      {threadPaths.map((t) => (
        <ThreadPathVisual key={t.id} threadPath={t} pinLayers={draftPinLayers} selected={false} />
      ))}
      {pinPaths.map((p) => (
        <PinPathVisual key={p.id} pinPath={p} selected={false} />
      ))}
    </g>
  );
}
