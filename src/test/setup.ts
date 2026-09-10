import "@testing-library/jest-dom/vitest";
import { Blob as NodeBlob, File as NodeFile } from "node:buffer";

// jsdom's Blob/File implement neither .text() nor .arrayBuffer() (checked against
// jsdom 25.0.1) — real browsers support both universally. Node's own Blob/File (which
// ARE the same Web-standard API) do support them, so swap jsdom's in for tests. This
// only affects code under test, never production (which runs in a real browser).
globalThis.Blob = NodeBlob as unknown as typeof Blob;
globalThis.File = NodeFile as unknown as typeof File;

// jsdom does not implement Blob object URLs — needed by any download flow (Save,
// SVG/PNG/JPEG export) that does `URL.createObjectURL(blob)` + a temporary <a download>.
if (!URL.createObjectURL) URL.createObjectURL = () => "blob:mock-url";
if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
