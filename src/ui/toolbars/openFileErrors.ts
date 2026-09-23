import type { TFunction } from "i18next";
import {
  CURRENT_PROJECT_VERSION,
  IncompatibleProjectVersionError,
  InvalidProjectFileError,
  NoMigrationPathError,
} from "@application/document";

// Discriminates on the named error classes from projectFile.ts rather than matching
// their (English, internal-diagnostic) `.message` text, so translation never depends on
// string-matching a message that was never meant to be parsed.
//
// Every call passes `{ ns: "errors" }` explicitly rather than relying on the caller's
// hook default namespace — FileMenu.tsx binds `useTranslation(["menus", "errors"])`,
// whose default namespace is "menus" (the first array element), so an un-namespaced
// key here would silently miss and fall back to the raw key string.
export function mapOpenFileError(err: unknown, t: TFunction<"errors">): string {
  if (err instanceof IncompatibleProjectVersionError) {
    return t("openFile.incompatibleVersion", { ns: "errors", found: String(err.foundVersion), max: CURRENT_PROJECT_VERSION });
  }
  if (err instanceof NoMigrationPathError) {
    return t("openFile.noMigrationPath", { ns: "errors", version: err.version });
  }
  if (err instanceof InvalidProjectFileError) {
    return t("openFile.invalid", { ns: "errors" });
  }
  return t("openFile.unknown", { ns: "errors" });
}
