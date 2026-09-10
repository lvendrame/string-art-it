import { findPinById, type PinLayer } from "./pinLayer";
import type { PinPath } from "./pinPath";
import type { ThreadPath } from "./threadPath";

// docs/specs/17-statistics.md
export interface PinPathStatistics {
  pins: number;
  requestedSpacing: number;
  actualSpacing: number;
  diameter: number;
}

export function pinPathStatistics(path: PinPath): PinPathStatistics {
  return { pins: path.pins.length, requestedSpacing: path.requestedSpacing, actualSpacing: path.actualSpacing, diameter: path.diameter };
}

export function projectTotalPins(pinLayers: PinLayer[]): number {
  return pinLayers.reduce((sum, l) => sum + l.pinPaths.reduce((s, p) => s + p.pins.length, 0), 0);
}

export interface ThreadPathStatistics {
  segments: number;
  lengthCm: number;
  pinsVisited: number;
  colours: string[];
}

// "Pins visited" counts occurrences along pinIds, including repeats — a thread that
// revisits a pin counts it twice, per docs/specs/17-statistics.md.
export function threadPathStatistics(thread: ThreadPath, pinLayers: PinLayer[]): ThreadPathStatistics {
  let lengthCm = 0;
  for (let i = 0; i < thread.pinIds.length - 1; i += 1) {
    const a = findPinById(pinLayers, thread.pinIds[i]);
    const b = findPinById(pinLayers, thread.pinIds[i + 1]);
    if (a && b) lengthCm += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return {
    segments: Math.max(thread.pinIds.length - 1, 0),
    lengthCm,
    pinsVisited: thread.pinIds.length,
    colours: thread.colours,
  };
}
