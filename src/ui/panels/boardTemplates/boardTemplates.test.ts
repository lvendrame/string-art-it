import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { migrateProjectFile, projectFileToDocument } from "../../../application/document";
import { BOARD_TEMPLATES } from "./boardTemplates";

// Regression guard (docs/specs/26-board-templates.md): every generated template file
// under public/board-templates must stay a valid, loadable ProjectFile, independent of
// scripts/generateBoardTemplates.mjs — this catches a future hand-edit that corrupts
// the schema, or a manifest entry pointing at a file that no longer exists.
describe("board templates", () => {
  it.each(BOARD_TEMPLATES)("$id round-trips through migrateProjectFile/projectFileToDocument", (template) => {
    const filePath = path.join(process.cwd(), "public", template.url);
    const raw = JSON.parse(readFileSync(filePath, "utf-8"));
    const migrated = migrateProjectFile(raw);
    const doc = projectFileToDocument(migrated);

    const pinCount = doc.pinLayers.reduce((sum, layer) => sum + layer.pinPaths.length, 0);
    const threadCount = doc.threadLayers.reduce((sum, layer) => sum + layer.threadPaths.length, 0);

    expect(pinCount).toBeGreaterThan(0);
    expect(threadCount).toBeGreaterThan(0);
    expect(doc.pinLayers[0].pinPaths.every((p) => p.pins.length > 0)).toBe(true);
    expect(doc.threadLayers[0].threadPaths.every((p) => p.pinIds.length > 0)).toBe(true);
  });
});
