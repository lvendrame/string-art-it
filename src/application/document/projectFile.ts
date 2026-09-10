import { createDefaultBoard, type Board } from "./board";
import { createPinLayer, type PinLayer } from "./pinLayer";
import { createThreadLayer, type ThreadLayer } from "./threadLayer";
import type { GridSettings } from "./EditorState";

// docs/specs/16-persistence.md — the versioned project file schema. Only the durable
// document content is persisted; tool state (selected tool, current selection, in-
// progress thread draft, viewport) is session-local and never saved.
export const CURRENT_PROJECT_VERSION = 1;

export interface ProjectFileV1 {
  version: 1;
  board: Board;
  grid: Pick<GridSettings, "gapX" | "gapY" | "colour" | "opacity">;
  pinLayers: PinLayer[];
  threadLayers: ThreadLayer[];
}

export type ProjectFile = ProjectFileV1;

export interface SerializableDocument {
  board: Board;
  grid: Pick<GridSettings, "gapX" | "gapY" | "colour" | "opacity">;
  pinLayers: PinLayer[];
  threadLayers: ThreadLayer[];
}

export function serializeProject(doc: SerializableDocument): ProjectFile {
  return { version: CURRENT_PROJECT_VERSION, ...doc };
}

export function createEmptyProject(): SerializableDocument {
  return {
    board: createDefaultBoard(),
    grid: { gapX: 1, gapY: 1, colour: "#6d5ef7", opacity: 0.6 },
    pinLayers: [createPinLayer("Layer 1")],
    threadLayers: [createThreadLayer("Layer 1")],
  };
}

// The migration seam (docs/specs/01-architecture.md "version migration"): each entry
// upgrades FROM that version TO the next one. Empty today (only v1 exists) but the
// shape is here so a v2 change never has to invent this mechanism under pressure.
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {};

export class IncompatibleProjectVersionError extends Error {
  constructor(foundVersion: unknown) {
    super(`Project file version ${String(foundVersion)} is newer than this app supports (max ${CURRENT_PROJECT_VERSION}).`);
  }
}

export function migrateProjectFile(raw: unknown): ProjectFile {
  if (typeof raw !== "object" || raw === null || !("version" in raw)) {
    throw new Error("Not a valid StringArtIt project file.");
  }
  let data = raw as Record<string, unknown>;
  let version = Number(data.version);

  if (version > CURRENT_PROJECT_VERSION) throw new IncompatibleProjectVersionError(version);

  while (version < CURRENT_PROJECT_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`No migration path from project version ${version}.`);
    data = step(data);
    version += 1;
  }

  return data as unknown as ProjectFile;
}

export function projectFileToDocument(file: ProjectFile): SerializableDocument {
  return { board: file.board, grid: file.grid, pinLayers: file.pinLayers, threadLayers: file.threadLayers };
}
