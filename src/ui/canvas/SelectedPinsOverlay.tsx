import type { PinLayer } from "../../application/document";

// docs/specs/26-edit-mode-multi-select.md — highlights every individually selected pin
// in Pins granularity. Replaces the old MergeSelectionOverlay (no hover-candidate
// concept in the new click/rubber-band model — Merge is an instant action, not a
// pointer gesture, so there's nothing to preview before it fires).
export function SelectedPinsOverlay({ pinLayers, selectedPinIds }: { pinLayers: PinLayer[]; selectedPinIds: string[] }) {
  if (selectedPinIds.length === 0) return null;
  return (
    <>
      {pinLayers.flatMap((l) =>
        l.pinPaths.flatMap((p) =>
          p.pins
            .filter((pin) => selectedPinIds.includes(pin.id))
            .map((pin) => (
              <circle key={pin.id} cx={pin.x} cy={pin.y} r={0.35} fill="none" stroke="var(--accent)" strokeWidth={0.08} data-testid="pin-selected" />
            )),
        ),
      )}
    </>
  );
}
