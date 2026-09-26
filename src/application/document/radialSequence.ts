import type { PinLayer } from "./pinLayer";
import { findPinPosition } from "./threadPattern";
import { pinIdAt } from "./twoPinSequence";

// docs/specs/37-radial-thread-tool.md — spokes from the anchor to every pin of the
// target pin's Pin Path, in path order, as one continuous [A,p1,A,p2,…] Thread Path.

function targetPathPinIds(layers: PinLayer[], targetPinId: string): string[] {
  const target = findPinPosition(layers, targetPinId);
  if (!target) return [];
  return target.path.pins.map((_, i) => pinIdAt(target.path, i, target.groupIndex));
}

export function computeRadialSequence(layers: PinLayer[], anchorPinId: string, targetPinId: string): string[] {
  if (anchorPinId === targetPinId || !findPinPosition(layers, anchorPinId)) return [];
  const spokes = targetPathPinIds(layers, targetPinId).filter((id) => id !== anchorPinId);
  return spokes.flatMap((id) => [anchorPinId, id]);
}
