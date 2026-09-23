import { describe, expect, it } from "vitest";
import i18n from "@i18n";
import { IncompatibleProjectVersionError, InvalidProjectFileError, NoMigrationPathError } from "@application/document";
import { mapOpenFileError } from "./openFileErrors";

const t = i18n.getFixedT(null, "errors");

describe("mapOpenFileError", () => {
  it("maps IncompatibleProjectVersionError to a message naming the found/max versions", () => {
    const message = mapOpenFileError(new IncompatibleProjectVersionError(5), t);
    expect(message).toContain("5");
  });

  it("maps NoMigrationPathError to a message naming the version", () => {
    const message = mapOpenFileError(new NoMigrationPathError(0), t);
    expect(message.length).toBeGreaterThan(0);
  });

  it("maps InvalidProjectFileError to the invalid-file message", () => {
    const message = mapOpenFileError(new InvalidProjectFileError(), t);
    expect(message.length).toBeGreaterThan(0);
  });

  it("falls back to the unknown-error message for anything else", () => {
    const message = mapOpenFileError(new Error("boom"), t);
    expect(message.length).toBeGreaterThan(0);
  });
});
