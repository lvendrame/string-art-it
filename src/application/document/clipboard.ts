import { pathBoundingBoxPoints, type Point } from "@domain/paths";
import { boundingBoxOf, translatePoint, type BoundingBox } from "@domain/transforms";
import { boardPath, type Board } from "./board";
import { nextId } from "./idCounter";
import type { PinLayer } from "./pinLayer";
import { nextPathId, nextPinId, translateGeometry, type PinPath } from "./pinPath";
import { allPinsWithMirrors, computeMirroredPinGroups, mirroredPinId, translateSymmetry } from "./symmetryConfig";
import type { ThreadLayer } from "./threadLayer";
import type { ThreadPath } from "./threadPath";

// docs/specs/39-copy-paste.md §Clipboard Envelope
export const CLIPBOARD_KIND = "stringartit/clipboard";
export const CLIPBOARD_VERSION = 1;
// Physical board units (cm) — 10 mm per paste step.
export const PASTE_OFFSET = 1;

export interface ClipboardContent {
  pinPaths: PinPath[];
  threadPaths: ThreadPath[];
}

export interface ClipboardPayload extends ClipboardContent {
  kind: typeof CLIPBOARD_KIND;
  version: number;
  copyId: string;
  sourceBoardId: string;
}

export function createInstanceToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// --- Copy ---

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => !seen.has(item.id) && seen.add(item.id));
}

function pinOwnerIndex(pinPaths: PinPath[]): Map<string, PinPath> {
  const owners = new Map<string, PinPath>();
  for (const path of pinPaths) {
    for (const pin of allPinsWithMirrors(path)) owners.set(pin.id, path);
  }
  return owners;
}

function allPinPaths(pinLayers: PinLayer[]): PinPath[] {
  return pinLayers.flatMap((l) => l.pinPaths);
}

function withResolvablePins(thread: ThreadPath, owners: Map<string, PinPath>): ThreadPath | null {
  const pinIds = thread.pinIds.filter((id) => owners.has(id));
  return pinIds.length >= 2 ? { ...thread, pinIds } : null;
}

function ownerPathsOf(threads: ThreadPath[], owners: Map<string, PinPath>): PinPath[] {
  return threads.flatMap((t) => t.pinIds.map((id) => owners.get(id)!));
}

function touchesAny(thread: ThreadPath, pinIds: Set<string>): boolean {
  return thread.pinIds.some((id) => pinIds.has(id));
}

export function collectFromPinPaths(pinLayers: PinLayer[], threadLayers: ThreadLayer[], paths: PinPath[]): ClipboardContent {
  const owners = pinOwnerIndex(allPinPaths(pinLayers));
  const selectedPinIds = new Set(paths.flatMap((p) => allPinsWithMirrors(p).map((pin) => pin.id)));
  const threadPaths = threadLayers
    .flatMap((l) => l.threadPaths)
    .filter((t) => touchesAny(t, selectedPinIds))
    .map((t) => withResolvablePins(t, owners))
    .filter((t): t is ThreadPath => !!t);
  return { pinPaths: uniqueById([...paths, ...ownerPathsOf(threadPaths, owners)]), threadPaths };
}

export function collectFromThread(pinLayers: PinLayer[], thread: ThreadPath): ClipboardContent {
  const owners = pinOwnerIndex(allPinPaths(pinLayers));
  const resolved = withResolvablePins(thread, owners);
  if (!resolved) return { pinPaths: [], threadPaths: [] };
  return { pinPaths: uniqueById(ownerPathsOf([resolved], owners)), threadPaths: [resolved] };
}

export function createClipboardPayload(content: ClipboardContent, sourceBoardId: string): ClipboardPayload {
  return { kind: CLIPBOARD_KIND, version: CLIPBOARD_VERSION, copyId: createInstanceToken(), sourceBoardId, ...content };
}

export function serializeClipboard(payload: ClipboardPayload): string {
  return JSON.stringify(payload);
}

// --- Parse ---

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPin(value: unknown): boolean {
  return isRecord(value) && typeof value.id === "string" && typeof value.x === "number" && typeof value.y === "number";
}

function isPinPathShape(value: unknown): value is PinPath {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isRecord(value.geometry) &&
    typeof value.geometry.type === "string" &&
    isRecord(value.symmetry) &&
    Array.isArray(value.pins) &&
    value.pins.every(isPin)
  );
}

function isThreadPathShape(value: unknown): value is ThreadPath {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.width === "number" &&
    Array.isArray(value.colours) &&
    Array.isArray(value.pinIds) &&
    value.pinIds.every((id) => typeof id === "string")
  );
}

function isEnvelope(raw: unknown): raw is ClipboardPayload {
  return (
    isRecord(raw) &&
    raw.kind === CLIPBOARD_KIND &&
    typeof raw.version === "number" &&
    raw.version <= CLIPBOARD_VERSION &&
    typeof raw.copyId === "string" &&
    typeof raw.sourceBoardId === "string" &&
    Array.isArray(raw.pinPaths) &&
    raw.pinPaths.length > 0 &&
    raw.pinPaths.every(isPinPathShape) &&
    Array.isArray(raw.threadPaths) &&
    raw.threadPaths.every(isThreadPathShape)
  );
}

function threadsResolveWithin(payload: ClipboardPayload): boolean {
  const owners = pinOwnerIndex(payload.pinPaths);
  return payload.threadPaths.every((t) => t.pinIds.every((id) => owners.has(id)));
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function parseClipboard(text: string): ClipboardPayload | null {
  const raw = tryParseJson(text);
  return isEnvelope(raw) && threadsResolveWithin(raw) ? raw : null;
}

// --- Paste ---

function mapMirrorPinIds(source: PinPath, newPinIds: string[], pinIdMap: Map<string, string>): void {
  const groupCount = computeMirroredPinGroups(source).length;
  for (let group = 0; group < groupCount; group += 1) {
    source.pins.forEach((pin, i) => pinIdMap.set(mirroredPinId(pin.id, group), mirroredPinId(newPinIds[i], group)));
  }
}

function clonePathForPaste(source: PinPath, delta: Point, pinIdMap: Map<string, string>): PinPath {
  const pins = source.pins.map((pin) => ({ id: nextPinId(), ...translatePoint(pin, delta) }));
  source.pins.forEach((pin, i) => pinIdMap.set(pin.id, pins[i].id));
  mapMirrorPinIds(
    source,
    pins.map((p) => p.id),
    pinIdMap,
  );
  return {
    ...source,
    id: nextPathId(),
    geometry: translateGeometry(source.geometry, delta),
    symmetry: translateSymmetry(source.symmetry, delta),
    pins,
  };
}

export function instantiateClipboard(payload: ClipboardContent, delta: Point): ClipboardContent {
  const pinIdMap = new Map<string, string>();
  const pinPaths = payload.pinPaths.map((p) => clonePathForPaste(p, delta, pinIdMap));
  const threadPaths = payload.threadPaths.map((t) => ({ ...t, id: nextId("threadpath"), pinIds: t.pinIds.map((id) => pinIdMap.get(id)!) }));
  return { pinPaths, threadPaths };
}

// --- Placement (docs/specs/39-copy-paste.md §Placement) ---

function contentBox(pinPaths: PinPath[]): BoundingBox {
  return boundingBoxOf(pinPaths.flatMap(allPinsWithMirrors));
}

function boardBox(board: Board): BoundingBox {
  return boundingBoxOf(pathBoundingBoxPoints(boardPath(board)));
}

function boxCentre(box: BoundingBox): Point {
  return { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
}

function isInside(inner: BoundingBox, outer: BoundingBox, delta: Point): boolean {
  return (
    inner.minX + delta.x >= outer.minX &&
    inner.maxX + delta.x <= outer.maxX &&
    inner.minY + delta.y >= outer.minY &&
    inner.maxY + delta.y <= outer.maxY
  );
}

function cascade(steps: number): Point {
  return { x: steps * PASTE_OFFSET, y: steps * PASTE_OFFSET };
}

// `pasteIndex` is 1 for the first paste of a given copy, 2 for the next, and so on.
export function pasteDelta(content: ClipboardContent, board: Board, pasteIndex: number, sameBoard: boolean): Point {
  const offset = cascade(sameBoard ? pasteIndex : pasteIndex - 1);
  const source = contentBox(content.pinPaths);
  const target = boardBox(board);
  if (isInside(source, target, offset)) return offset;
  const from = boxCentre(source);
  const to = boxCentre(target);
  const recentredCascade = cascade(pasteIndex - 1);
  return { x: to.x - from.x + recentredCascade.x, y: to.y - from.y + recentredCascade.y };
}
