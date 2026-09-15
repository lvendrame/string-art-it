import { useState } from "react";
import type { EditorState, PinTool, ThreadTool } from "../../application/document";
import type { Point } from "../../domain/paths";
import { nearestPinOwner, nearestThreadPath, type PinHit, type ThreadHit } from "./hitTesting";

// docs/specs/11-erasers.md — none of the four erasers previously showed what a click
// would remove before it landed. Tracks one hit per eraser tool so EraserHoverOverlay can
// render a `--danger` preview matching exactly what that tool's click would delete.
export function useEraserHover(state: EditorState) {
  const [pinEraserHit, setPinEraserHit] = useState<PinHit | null>(null);
  const [pathEraserHit, setPathEraserHit] = useState<PinHit | null>(null);
  const [threadEraserHit, setThreadEraserHit] = useState<ThreadHit | null>(null);
  const [segmentEraserHit, setSegmentEraserHit] = useState<ThreadHit | null>(null);

  function handlePinMouseMove(raw: Point, maxDist: number, pinTool: PinTool): void {
    setPinEraserHit(pinTool === "eraser" ? nearestPinOwner(state.pinLayers, raw, maxDist) : null);
    setPathEraserHit(pinTool === "path-eraser" ? nearestPinOwner(state.pinLayers, raw, maxDist) : null);
  }

  function handleThreadMouseMove(raw: Point, maxDist: number, threadTool: ThreadTool): void {
    setThreadEraserHit(threadTool === "eraser" ? nearestThreadPath(state.threadLayers, state.pinLayers, raw, maxDist) : null);
    setSegmentEraserHit(threadTool === "segment-eraser" ? nearestThreadPath(state.threadLayers, state.pinLayers, raw, maxDist) : null);
  }

  return { pinEraserHit, pathEraserHit, threadEraserHit, segmentEraserHit, handlePinMouseMove, handleThreadMouseMove };
}
