import { findPinById, type PinLayer } from "../../../application/document";
import type { Point } from "../../../domain/paths";

export function DraftPreviewLine({
  pinLayers,
  lastPinId,
  cursorDoc,
  threadCandidateId,
  colour,
  width,
}: {
  pinLayers: PinLayer[];
  lastPinId: string;
  cursorDoc: Point | null;
  threadCandidateId: string | null;
  colour: string;
  width: number;
}) {
  if (!cursorDoc) return null;
  const from = findPinById(pinLayers, lastPinId);
  const to = threadCandidateId ? findPinById(pinLayers, threadCandidateId) : cursorDoc;
  if (!from || !to) return null;
  return <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={colour} strokeWidth={width * 0.1} strokeDasharray="0.2 0.15" data-testid="thread-preview" />;
}
