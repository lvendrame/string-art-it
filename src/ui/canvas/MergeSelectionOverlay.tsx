import type { PinLayer } from "../../application/document";

// docs/specs/09-selection-and-editing.md Merge tool — outlines every pin accumulated
// so far, so the user can see what's pending before right-clicking to commit.
export function MergeSelectionOverlay({ pinLayers, selectedPinIds }: { pinLayers: PinLayer[]; selectedPinIds: string[] }) {
  if (selectedPinIds.length === 0) return null;
  return (
    <>
      {pinLayers.flatMap((l) =>
        l.pinPaths.flatMap((p) =>
          p.pins
            .filter((pin) => selectedPinIds.includes(pin.id))
            .map((pin) => (
              <circle key={pin.id} cx={pin.x} cy={pin.y} r={0.35} fill="none" stroke="var(--accent)" strokeWidth={0.08} data-testid="pin-merge-selected" />
            )),
        ),
      )}
    </>
  );
}
