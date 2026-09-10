import type { SymmetryConfig } from "../../application/document";

// SVG `transform` strings, one per mirrored/radial copy under `config` (excluding the
// source) — the same math as domain/symmetry's mirrorCopies/generateRadialCopies, just
// expressed as an SVG transform so the in-progress drawing preview (docs/specs/06-
// symmetry.md: "copies appear live as the source geometry is drawn") can clone its
// rendered <path> directly instead of re-deriving mirrored geometry per shape type.
export function symmetryPreviewTransforms(config: SymmetryConfig): string[] {
  if (config.type === "none") return [];

  if (config.type === "radial") {
    const { centre, intervalDegrees } = config;
    const transforms: string[] = [];
    for (let angleDeg = intervalDegrees; angleDeg < 360; angleDeg += intervalDegrees) {
      transforms.push(`rotate(${angleDeg} ${centre.x} ${centre.y})`);
    }
    return transforms;
  }

  const { axis } = config;
  const vertical = `translate(${2 * axis.x} 0) scale(-1 1)`;
  const horizontal = `translate(0 ${2 * axis.y}) scale(1 -1)`;
  if (config.type === "vertical") return [vertical];
  if (config.type === "horizontal") return [horizontal];
  return [vertical, horizontal, `translate(${2 * axis.x} ${2 * axis.y}) scale(-1 -1)`];
}
