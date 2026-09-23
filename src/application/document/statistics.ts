import { pathLength } from "@domain/paths";
import { findPinById, type PinLayer } from "./pinLayer";
import { geometryToContourPaths, type PinPath } from "./pinPath";
import type { ThreadLayer } from "./threadLayer";
import type { ThreadPath } from "./threadPath";

// docs/specs/17-statistics.md
export interface PinPathStatistics {
  pins: number;
  requestedSpacing: number;
  actualSpacing: number;
  diameter: number;
  perimeterCm: number;
}

// perimeterCm sums every contour's length (multi-contour Text Pin Paths — a letter's
// hole or disconnected piece — contribute more than one), reusing the same
// geometryToContourPaths generalization distribution/rendering already rely on so a
// single-contour shape's perimeter is exactly geometryToPath's length.
export function pinPathStatistics(path: PinPath): PinPathStatistics {
  const perimeterCm = geometryToContourPaths(path.geometry).reduce((sum, contour) => sum + pathLength(contour), 0);
  return { pins: path.pins.length, requestedSpacing: path.requestedSpacing, actualSpacing: path.actualSpacing, diameter: path.diameter, perimeterCm };
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

export interface ProjectThreadTotals {
  threadCount: number;
  totalLengthCm: number;
}

// docs/specs/31-webmcp-agent-tools.md get_document_stats — mirrors projectTotalPins'
// shape (sum across every layer) for the thread side, which had no project-level
// aggregate before (StatisticsPanel only ever showed per-thread cards).
export function projectThreadTotals(threadLayers: ThreadLayer[], pinLayers: PinLayer[]): ProjectThreadTotals {
  let threadCount = 0;
  let totalLengthCm = 0;
  for (const layer of threadLayers) {
    for (const thread of layer.threadPaths) {
      threadCount += 1;
      totalLengthCm += threadPathStatistics(thread, pinLayers).lengthCm;
    }
  }
  return { threadCount, totalLengthCm };
}

export interface ThreadTypeStatistics {
  colours: string[];
  width: number;
  threadCount: number;
  totalSegments: number;
  totalLengthCm: number;
  totalPinsVisited: number;
}

// docs/specs/17-statistics.md Summary — groups every Thread Path by its "type": the
// exact (colours, width) combination. A thread with colours ["red", "white"] is its
// own type, distinct from a plain "red" thread or a plain "white" one — colours are
// concurrent twisted strands (see threadPath.ts), not a set to split stats across.
export function threadStatisticsByType(threadLayers: ThreadLayer[], pinLayers: PinLayer[]): ThreadTypeStatistics[] {
  const byType = new Map<string, ThreadTypeStatistics>();
  for (const layer of threadLayers) {
    for (const thread of layer.threadPaths) {
      const stats = threadPathStatistics(thread, pinLayers);
      const key = JSON.stringify([thread.colours, thread.width]);
      const bucket = byType.get(key) ?? { colours: thread.colours, width: thread.width, threadCount: 0, totalSegments: 0, totalLengthCm: 0, totalPinsVisited: 0 };
      bucket.threadCount += 1;
      bucket.totalSegments += stats.segments;
      bucket.totalLengthCm += stats.lengthCm;
      bucket.totalPinsVisited += stats.pinsVisited;
      byType.set(key, bucket);
    }
  }
  return [...byType.values()];
}
