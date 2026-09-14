#!/usr/bin/env node
// One-time authoring tool (docs/specs/26-board-templates.md) — NOT part of the app
// runtime bundle. Reads the reference string-art SVGs in .tmp/patterns/*.svg (scratch,
// not committed) and writes real, loadable project files — the app's own
// ProjectFileV1 format (src/application/document/projectFile.ts) — to
// public/board-templates/*.json.
//
// Run with: node scripts/generateBoardTemplates.mjs
//
// Unlike a naive "one circle per radius band" approximation, this detects which real
// document primitive each design actually is:
//   - a single closed/open shape (circle, oval, rectangle, square, line, or — only if
//     none of those fit — an explicit "freehand" polyline), OR
//   - one drawn arm/half repeated via the app's own Symmetry feature (radial or
//     mirror), in which case only the ONE source PinPath is stored and every other
//     arm's chords reference the app's derived `<pinId>~mirror-N` ids
//     (application/document/symmetryConfig.ts) — exactly how a person would build the
//     same design by hand in the editor.

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, ".tmp/patterns");
const OUT_DIR = path.join(ROOT, "public/board-templates");

const MAX_LINES_PER_TEMPLATE = 1200; // perf/output-size cap — documented scope note
const TARGET_LONGEST_EXTENT_CM = 40; // physical size the largest board dimension maps to

const TEMPLATES = [
  { file: "Spiral.svg", id: "spiral" },
  { file: "Comet.svg", id: "comet" },
  { file: "Flower.svg", id: "flower" },
  { file: "Lotus.svg", id: "lotus" },
  { file: "Sun.svg", id: "sun" },
  { file: "Star of David.svg", id: "star-of-david" },
  { file: "Spirals.svg", id: "spirals" },
  { file: "Assymetry.svg", id: "assymetry" },
  { file: "Polygon.svg", id: "polygon" },
];

// ---------------------------------------------------------------------------
// Small math utilities
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalizeAngle(a) {
  let x = a % TAU;
  if (x < 0) x += TAU;
  return x;
}

function rotateAround(p, center, radians) {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

function reflectVertical(p, axisX) {
  return { x: 2 * axisX - p.x, y: p.y };
}

function reflectHorizontal(p, axisY) {
  return { x: p.x, y: 2 * axisY - p.y };
}

function centroidOf(points) {
  const n = points.length;
  return { x: points.reduce((s, p) => s + p.x, 0) / n, y: points.reduce((s, p) => s + p.y, 0) / n };
}

// Nearest-neighbour RMS distance from `a` to the closest point in `b`, normalised by
// `scale` — used to score how well one point set maps onto another (self-symmetry, or
// mirrored-arm matching).
function nearestNeighbourResidual(a, b, scale) {
  if (a.length === 0) return Infinity;
  let sum = 0;
  for (const p of a) {
    let best = Infinity;
    for (const q of b) {
      const d = dist(p, q);
      if (d < best) best = d;
    }
    sum += best;
  }
  return sum / a.length / scale;
}

// ---------------------------------------------------------------------------
// Path primitives, ported from src/domain/paths — kept numerically identical so a
// later in-app edit (recompute spacing, etc.) lands on the same pins.
// ---------------------------------------------------------------------------

function lineLength(a, b) {
  return dist(a, b);
}
function lineAtDistance(a, b, d, total) {
  const t = total === 0 ? 0 : d / total;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function circularArcAtDistance(center, radius, startAngle, sweep, len, distance) {
  const t = len === 0 ? 0 : distance / len;
  const angle = startAngle + sweep * t;
  return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
}

// Port of EllipticalArcSegment: no closed form for arc length, so densely sample and
// interpolate (src/domain/paths/EllipticalArcSegment.ts).
function buildEllipseSampler(center, radiusX, radiusY, rotation, startAngle, sweep) {
  const SAMPLES = 1440;
  const pointAtAngle = (angle) => {
    const ex = radiusX * Math.cos(angle);
    const ey = radiusY * Math.sin(angle);
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return { x: center.x + ex * cos - ey * sin, y: center.y + ex * sin + ey * cos };
  };
  const cumulative = [0];
  const angles = [startAngle];
  let acc = 0;
  let prev = pointAtAngle(startAngle);
  for (let i = 1; i <= SAMPLES; i += 1) {
    const angle = startAngle + (sweep * i) / SAMPLES;
    const pt = pointAtAngle(angle);
    acc += dist(pt, prev);
    cumulative.push(acc);
    angles.push(angle);
    prev = pt;
  }
  const length = cumulative[cumulative.length - 1];
  const pointAtDistance = (distance) => {
    if (distance <= 0) return pointAtAngle(angles[0]);
    if (distance >= length) return pointAtAngle(angles[angles.length - 1]);
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi - 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (cumulative[mid] <= distance) lo = mid;
      else hi = mid;
    }
    const segLen = cumulative[hi] - cumulative[lo];
    const t = segLen === 0 ? 0 : (distance - cumulative[lo]) / segLen;
    return pointAtAngle(angles[lo] + (angles[hi] - angles[lo]) * t);
  };
  return { length, pointAtDistance };
}

// Port of distribution.ts's closestIntervalCount/distributeClosedPath/distributeOpenPath.
function closestIntervalCount(perimeter, requestedSpacing) {
  const approx = perimeter / requestedSpacing;
  const lo = Math.max(1, Math.floor(approx));
  const hi = Math.max(1, Math.ceil(approx));
  if (lo === hi) return lo;
  const diffLo = Math.abs(perimeter / lo - requestedSpacing);
  const diffHi = Math.abs(perimeter / hi - requestedSpacing);
  return diffHi < diffLo ? hi : lo;
}

function distributeClosed(length, pointAtDistance, requestedSpacing) {
  const n = closestIntervalCount(length, requestedSpacing);
  const actualSpacing = length / n;
  const points = Array.from({ length: n }, (_, i) => pointAtDistance(i * actualSpacing));
  return { points, actualSpacing, n };
}

function distributeOpen(length, pointAtDistance, requestedSpacing) {
  const n = Math.floor(length / requestedSpacing) + 1;
  const points = Array.from({ length: n }, (_, i) => pointAtDistance(Math.min(i * requestedSpacing, length)));
  return { points, actualSpacing: requestedSpacing, n };
}

// Vertex-anchored distribution for a closed polygon (rectangle/square) — one pin per
// corner, interior pins per-edge via closestIntervalCount (distribution.ts's
// distributePathPerVertex, specialised to a plain vertex ring).
function distributeVertexRing(vertices, requestedSpacing) {
  const points = [];
  vertices.forEach((v, i) => {
    const next = vertices[(i + 1) % vertices.length];
    const segLen = dist(v, next);
    points.push(v);
    const n = closestIntervalCount(segLen, requestedSpacing);
    for (let k = 1; k < n; k += 1) points.push(lineAtDistance(v, next, k * (segLen / n), segLen));
  });
  return points;
}

// Ports of src/domain/shapes/polygonFamily.ts's vertex placement, so a fitted
// regular-polygon/star lands on exactly the vertices the app's own factory would draw.
function vertexAt(center, radius, angle) {
  return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
}
function regularPolygonVertices(center, radius, sides, rotation) {
  return Array.from({ length: sides }, (_, i) => vertexAt(center, radius, rotation + (TAU * i) / sides - Math.PI / 2));
}
function regularPolygonPerimeterFromVertices(vertices) {
  return vertices.reduce((s, v, i) => s + dist(v, vertices[(i + 1) % vertices.length]), 0);
}
function starVertices(center, outerRadius, innerRadius, points, rotation) {
  const step = Math.PI / points;
  const vertices = [];
  for (let i = 0; i < points * 2; i += 1) {
    const angle = rotation + i * step - Math.PI / 2;
    vertices.push(vertexAt(center, i % 2 === 0 ? outerRadius : innerRadius, angle));
  }
  return vertices;
}

// ---------------------------------------------------------------------------
// SVG parsing
// ---------------------------------------------------------------------------

function parseColour(raw) {
  const hsl = /^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/.exec(raw);
  if (!hsl) return raw;
  const h = Number(hsl[1]) / 360;
  const s = Number(hsl[2]) / 100;
  const l = Number(hsl[3]) / 100;
  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function parseSvg(svgPath) {
  const txt = readFileSync(svgPath, "utf-8");
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(txt);
  const width = Number(vb[1]);
  const height = Number(vb[2]);

  const tagRe = /<(\/?)(g|line)\b([^>]*)>/g;
  const strokeStack = [];
  const lines = [];
  let m;
  while ((m = tagRe.exec(txt))) {
    const [, closing, tag, attrs] = m;
    if (tag === "g") {
      if (closing) strokeStack.pop();
      else {
        const strokeMatch = /stroke="([^"]*)"/.exec(attrs);
        strokeStack.push(strokeMatch ? strokeMatch[1] : strokeStack[strokeStack.length - 1]);
      }
      continue;
    }
    if (closing) continue;
    const x1 = Number(/x1="([\d.]+)"/.exec(attrs)[1]);
    const y1 = Number(/y1="([\d.]+)"/.exec(attrs)[1]);
    const x2 = Number(/x2="([\d.]+)"/.exec(attrs)[1]);
    const y2 = Number(/y2="([\d.]+)"/.exec(attrs)[1]);
    lines.push({ x1, y1, x2, y2, colour: parseColour(strokeStack[strokeStack.length - 1] ?? "#ffffff") });
  }
  return { width, height, lines };
}

function keyOf(x, y) {
  return `${Math.round(x * 4) / 4},${Math.round(y * 4) / 4}`;
}

// ---------------------------------------------------------------------------
// Shape fitting — tries, in order, the real PinPathGeometry variants a person could
// have actually drawn, falling back to an explicit "freehand" polyline only when
// nothing else fits.
// ---------------------------------------------------------------------------

function pca(points, center) {
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of points) {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const n = points.length;
  sxx /= n;
  sxy /= n;
  syy /= n;
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return angle;
}

function fitCircleKasa(points) {
  // Linear least-squares fit of x^2+y^2+Dx+Ey+F=0.
  let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, sxz = 0, syz = 0, sz = 0, n = points.length;
  for (const p of points) {
    const z = p.x * p.x + p.y * p.y;
    sxx += p.x * p.x;
    sxy += p.x * p.y;
    syy += p.y * p.y;
    sx += p.x;
    sy += p.y;
    sxz += p.x * z;
    syz += p.y * z;
    sz += z;
  }
  // Solve the 3x3 normal-equations system [sxx sxy sx; sxy syy sy; sx sy n] * [D E F]' = -[sxz syz sz]'
  const A = [
    [sxx, sxy, sx],
    [sxy, syy, sy],
    [sx, sy, n],
  ];
  const b = [-sxz, -syz, -sz];
  const sol = solve3x3(A, b);
  if (!sol) return null;
  const [D, E, F] = sol;
  const cx = -D / 2;
  const cy = -E / 2;
  const r2 = cx * cx + cy * cy - F;
  if (r2 <= 0) return null;
  return { center: { x: cx, y: cy }, radius: Math.sqrt(r2) };
}

function solve3x3(A, b) {
  const det = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(A);
  if (Math.abs(D) < 1e-9) return null;
  const replace = (col) => A.map((row, i) => row.map((v, j) => (j === col ? b[i] : v)));
  return [det(replace(0)) / D, det(replace(1)) / D, det(replace(2)) / D];
}

function distanceToSegment(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq));
  return dist(p, { x: a.x + abx * t, y: a.y + aby * t });
}

function residualOf(points, distanceFn, scale) {
  let sum = 0;
  for (const p of points) sum += Math.abs(distanceFn(p));
  return sum / points.length / scale;
}

// Fits, in priority order: line, circle, ellipse, rectangle/square, else null
// (caller falls back to freehand). `closedHint` says whether the point set's own
// angular coverage looks like a full loop (closed) or a partial arc/curve (open).
function fitShape(orderedPoints, closedHint) {
  const centroid = centroidOf(orderedPoints);
  const scale = Math.max(...orderedPoints.map((p) => dist(p, centroid))) || 1;

  // --- line ---
  {
    const angle = pca(orderedPoints, centroid);
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    const normal = { x: -dir.y, y: dir.x };
    const res = residualOf(orderedPoints, (p) => (p.x - centroid.x) * normal.x + (p.y - centroid.y) * normal.y, scale);
    if (res < 0.02) {
      let tMin = Infinity;
      let tMax = -Infinity;
      for (const p of orderedPoints) {
        const t = (p.x - centroid.x) * dir.x + (p.y - centroid.y) * dir.y;
        tMin = Math.min(tMin, t);
        tMax = Math.max(tMax, t);
      }
      const start = { x: centroid.x + dir.x * tMin, y: centroid.y + dir.y * tMin };
      const end = { x: centroid.x + dir.x * tMax, y: centroid.y + dir.y * tMax };
      return { kind: "line", start, end };
    }
  }

  if (closedHint) {
    // Try a spread of candidate rotations rather than trusting PCA's angle, which is
    // numerically unstable (near-arbitrary) whenever the shape is close to isotropic —
    // a near-square rectangle or an N-gon both have that problem.
    function bestRotation(angleStep, residualFn) {
      let best = null;
      for (let a = 0; a < Math.PI; a += angleStep) {
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        let maxU = 0;
        let maxV = 0;
        for (const p of orderedPoints) {
          const dx = p.x - centroid.x;
          const dy = p.y - centroid.y;
          maxU = Math.max(maxU, Math.abs(dx * cos + dy * sin));
          maxV = Math.max(maxV, Math.abs(-dx * sin + dy * cos));
        }
        const res = residualFn(cos, sin, maxU, maxV);
        if (!best || res < best.res) best = { rotation: a, cos, sin, maxU, maxV, res };
      }
      return best;
    }

    // --- circle / ellipse ---
    const ellipseFit = bestRotation(Math.PI / 90, (cos, sin, maxU, maxV) =>
      residualOf(
        orderedPoints,
        (p) => {
          const dx = p.x - centroid.x;
          const dy = p.y - centroid.y;
          const u = dx * cos + dy * sin;
          const v = -dx * sin + dy * cos;
          return Math.sqrt((u / maxU) ** 2 + (v / maxV) ** 2) - 1;
        },
        1,
      ),
    );
    if (ellipseFit.res < 0.05) {
      const { maxU, maxV, rotation } = ellipseFit;
      if (Math.abs(maxU - maxV) / Math.max(maxU, maxV) < 0.04) {
        return { kind: "circle", center: centroid, radius: (maxU + maxV) / 2 };
      }
      return { kind: "ellipse", center: centroid, radiusX: maxU, radiusY: maxV, rotation };
    }

    // --- rectangle / square (bounding-box hugging, best of a rotation sweep) ---
    const rectFit = bestRotation(Math.PI / 90, (cos, sin, maxU, maxV) =>
      residualOf(
        orderedPoints,
        (p) => {
          const dx = p.x - centroid.x;
          const dy = p.y - centroid.y;
          const u = dx * cos + dy * sin;
          const v = -dx * sin + dy * cos;
          return Math.min(maxU - Math.abs(u), maxV - Math.abs(v));
        },
        Math.max(maxU, maxV) * 2,
      ),
    );
    if (rectFit.res < 0.03) {
      const { cos, sin, maxU: half_x, maxV: half_y, rotation } = rectFit;
      const corners = [
        { x: -half_x, y: -half_y },
        { x: half_x, y: -half_y },
        { x: half_x, y: half_y },
        { x: -half_x, y: half_y },
      ].map((c) => ({ x: centroid.x + c.x * cos - c.y * sin, y: centroid.y + c.x * sin + c.y * cos }));
      const isSquare = Math.abs(half_x - half_y) / Math.max(half_x, half_y) < 0.04;
      // rectangleShape's `position` is the top-left corner BEFORE rotation is applied
      // about the centre (src/domain/shapes/rectangleSquare.ts) — not one of the
      // already-rotated `corners` used only for placing pins in world space.
      const position = { x: centroid.x - half_x, y: centroid.y - half_y };
      return { kind: isSquare ? "square" : "rectangle", corners, position, rotation, halfWidth: half_x, halfHeight: half_y };
    }

    // --- regular polygon / star (N-fold rotational self-match) ---
    const rMaxLocal = Math.max(...orderedPoints.map((p) => dist(p, centroid))) || 1;
    let bestPolygon = null;
    for (let n = 3; n <= 12; n += 1) {
      const interval = TAU / n;
      const rotated = orderedPoints.map((p) => rotateAround(p, centroid, interval));
      const res = nearestNeighbourResidual(rotated, orderedPoints, rMaxLocal);
      if (res < 0.01 && (!bestPolygon || n > bestPolygon.n)) bestPolygon = { n, res };
    }
    if (bestPolygon) {
      const { n } = bestPolygon;
      const withAngle = orderByAngle(orderedPoints, centroid).map((p) => ({ ...p, r: dist(p, centroid) }));
      let vertexIdx = 0;
      for (let i = 1; i < withAngle.length; i += 1) if (withAngle[i].r > withAngle[vertexIdx].r) vertexIdx = i;
      const vertexAngle = withAngle[vertexIdx].angle;
      const rotation = vertexAngle + Math.PI / 2;

      // Average the radius near each of the N vertex angles and each of the N valley
      // angles (halfway between consecutive vertices), rather than trusting a single
      // sample — far more robust than one scalar min/max against angular noise.
      const interval = TAU / n;
      const averageRadiusNear = (targetAngle, toleranceFrac) => {
        const tolerance = interval * toleranceFrac;
        let sum = 0;
        let count = 0;
        for (const p of withAngle) {
          let d = normalizeAngle(p.angle - targetAngle);
          if (d > Math.PI) d -= TAU;
          if (Math.abs(d) <= tolerance) {
            sum += p.r;
            count += 1;
          }
        }
        return count > 0 ? sum / count : null;
      };
      let outerSum = 0;
      let outerCount = 0;
      let innerSum = 0;
      let innerCount = 0;
      for (let i = 0; i < n; i += 1) {
        const outer = averageRadiusNear(vertexAngle + i * interval, 0.15);
        const inner = averageRadiusNear(vertexAngle + interval / 2 + i * interval, 0.15);
        if (outer !== null) {
          outerSum += outer;
          outerCount += 1;
        }
        if (inner !== null) {
          innerSum += inner;
          innerCount += 1;
        }
      }
      const outerRadius = outerCount > 0 ? outerSum / outerCount : withAngle[vertexIdx].r;
      const innerRadius = innerCount > 0 ? innerSum / innerCount : outerRadius;

      // The rotational self-match above only proves the CLOUD has N-fold symmetry —
      // plenty of organic blobs do too. A real polygon/star pin path additionally has
      // every pin sitting ON the straight edges, not scattered through the interior —
      // verify that before committing, or fall back to freehand (a Lotus-shaped blob
      // that happens to have rough 9-fold symmetry must not collapse to a bare
      // 9-gon outline and lose all its interior chord structure).
      const edgeHuggingResidual = (vertices) => {
        const perimeter = vertices.reduce((s, v, i) => s + dist(v, vertices[(i + 1) % vertices.length]), 0);
        const avgEdge = perimeter / vertices.length;
        let sum = 0;
        for (const p of orderedPoints) {
          let best = Infinity;
          for (let i = 0; i < vertices.length; i += 1) {
            best = Math.min(best, distanceToSegment(p, vertices[i], vertices[(i + 1) % vertices.length]));
          }
          sum += best;
        }
        return sum / orderedPoints.length / avgEdge;
      };

      const isStar = innerRadius / outerRadius < 0.85;
      const vertices = isStar
        ? starVertices(centroid, outerRadius, innerRadius, n, rotation)
        : regularPolygonVertices(centroid, outerRadius, n, rotation);
      const hugRes = edgeHuggingResidual(vertices);
      if (hugRes < 0.05) {
        if (isStar) return { kind: "star", center: centroid, outerRadius, innerRadius, points: n, rotation };
        return { kind: "regular-polygon", center: centroid, radius: outerRadius, sides: n, rotation };
      }
    }

    return null;
  }

  // --- arc (open) ---
  const fit = fitCircleKasa(orderedPoints);
  if (fit) {
    const res = residualOf(orderedPoints, (p) => dist(p, fit.center) - fit.radius, fit.radius);
    if (res < 0.03) {
      const start = orderedPoints[0];
      const end = orderedPoints[orderedPoints.length - 1];
      const mid = orderedPoints[Math.floor(orderedPoints.length / 2)];
      const chord = dist(start, end);
      const half = chord / 2;
      const R = fit.radius;
      const sMag = R - Math.sqrt(Math.max(0, R * R - half * half));
      const chordMid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      const n = { x: -(end.y - start.y) / chord, y: (end.x - start.x) / chord };
      const apexA = { x: chordMid.x + n.x * sMag, y: chordMid.y + n.y * sMag };
      const apexB = { x: chordMid.x - n.x * sMag, y: chordMid.y - n.y * sMag };
      const sign = dist(apexA, mid) <= dist(apexB, mid) ? 1 : -1;
      return { kind: "arc", start, end, curvature: sign * sMag };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Symmetry detection
// ---------------------------------------------------------------------------

function angularCoefficientOfVariation(points, centroid) {
  const bins = new Array(36).fill(0);
  for (const p of points) {
    const a = normalizeAngle(Math.atan2(p.y - centroid.y, p.x - centroid.x));
    bins[Math.min(35, Math.floor((a / TAU) * 36))] += 1;
  }
  const mean = bins.reduce((s, v) => s + v, 0) / bins.length;
  const variance = bins.reduce((s, v) => s + (v - mean) ** 2, 0) / bins.length;
  return { cov: mean === 0 ? 0 : Math.sqrt(variance) / mean, bins };
}

// Angular-gap clustering: sort points by angle, split wherever the gap to the next
// point is large relative to the median gap. Returns one array of points per cluster.
function clusterByAngularGaps(points, centroid) {
  const withAngle = points
    .map((p) => ({ ...p, angle: normalizeAngle(Math.atan2(p.y - centroid.y, p.x - centroid.x)) }))
    .sort((a, b) => a.angle - b.angle);
  const gaps = withAngle.map((p, i) => {
    const next = withAngle[(i + 1) % withAngle.length];
    const d = i === withAngle.length - 1 ? next.angle + TAU - p.angle : next.angle - p.angle;
    return d;
  });
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const median = sortedGaps[Math.floor(sortedGaps.length / 2)] || 0.01;
  const breakIndices = new Set();
  gaps.forEach((g, i) => {
    if (g > Math.max(median * 4, 0.05)) breakIndices.add(i);
  });
  if (breakIndices.size === 0) return [points];
  const clusters = [];
  let current = [];
  for (let i = 0; i < withAngle.length; i += 1) {
    current.push(withAngle[i]);
    if (breakIndices.has(i)) {
      clusters.push(current);
      current = [];
    }
  }
  if (current.length) {
    if (clusters.length === 0) clusters.push(current);
    else clusters[clusters.length - 1] = clusters[clusters.length - 1].concat(current);
  }
  return clusters;
}

// Detects the document's real construction: a single shape, or one arm/half repeated
// via Symmetry. Returns { type: "none" } | { type: "radial", n, intervalDegrees,
// centre } | { type: "horizontal"|"vertical", axis }.
function detectSymmetry(uniquePoints, centroid, rMax) {
  const { cov } = angularCoefficientOfVariation(uniquePoints, centroid);
  if (cov < 0.5) return { type: "none" }; // azimuthally uniform -> a plain ring/shape, not a repeated arm

  const clusters = clusterByAngularGaps(uniquePoints, centroid);
  const k = clusters.length;
  if (k >= 2 && k <= 16) {
    const interval = TAU / k;
    const rotated = uniquePoints.map((p) => rotateAround(p, centroid, interval));
    const residual = nearestNeighbourResidual(rotated, uniquePoints, rMax);
    if (residual < 0.03) {
      return { type: "radial", n: k, intervalDegrees: (interval * 180) / Math.PI, centre: centroid };
    }
  }

  // Mirror candidates (only meaningful for a 2-cluster gapped shape, e.g. top/bottom).
  const vReflected = uniquePoints.map((p) => reflectVertical(p, centroid.x));
  const hReflected = uniquePoints.map((p) => reflectHorizontal(p, centroid.y));
  const vRes = nearestNeighbourResidual(vReflected, uniquePoints, rMax);
  const hRes = nearestNeighbourResidual(hReflected, uniquePoints, rMax);
  const best = vRes <= hRes ? { type: "vertical", res: vRes, axis: { x: centroid.x, y: centroid.y } } : { type: "horizontal", res: hRes, axis: { x: centroid.x, y: centroid.y } };
  if (best.res < 0.03) return { type: best.type, axis: best.axis };

  return { type: "none" };
}

function foldIndexRadial(point, centroid, n, intervalDegrees, baseClusterAngleRange) {
  const angle = normalizeAngle(Math.atan2(point.y - centroid.y, point.x - centroid.x));
  const interval = (intervalDegrees * Math.PI) / 180;
  // Steps forward from the base cluster's own angular reference.
  let steps = Math.round(normalizeAngle(angle - baseClusterAngleRange) / interval);
  steps = ((steps % n) + n) % n;
  return steps; // 0 = base, 1..n-1 = mirror-(steps-1)
}

// ---------------------------------------------------------------------------
// Per-template generation
// ---------------------------------------------------------------------------

function buildPinsForShape(shape, requestedSpacing) {
  switch (shape.kind) {
    case "line": {
      const length = lineLength(shape.start, shape.end);
      const { points } = distributeOpen(length, (d) => lineAtDistance(shape.start, shape.end, d, length), requestedSpacing);
      return { points, geometry: { type: "line", start: shape.start, end: shape.end } };
    }
    case "arc": {
      const chord = dist(shape.start, shape.end);
      const s = shape.curvature;
      const r = (4 * s * s + chord * chord) / (8 * s);
      const mid = { x: (shape.start.x + shape.end.x) / 2, y: (shape.start.y + shape.end.y) / 2 };
      const nx = -(shape.end.y - shape.start.y) / chord;
      const ny = (shape.end.x - shape.start.x) / chord;
      const center = { x: mid.x - nx * (r - s), y: mid.y - ny * (r - s) };
      const radius = Math.abs(r);
      const startAngle = Math.atan2(shape.start.y - center.y, shape.start.x - center.x);
      const endAngle = Math.atan2(shape.end.y - center.y, shape.end.x - center.x);
      let sweep = endAngle - startAngle;
      while (sweep <= -Math.PI) sweep += TAU;
      while (sweep > Math.PI) sweep -= TAU;
      // Pick whichever winding direction actually passes near the apex implied by s.
      const apex = { x: mid.x + nx * s, y: mid.y + ny * s };
      const altSweep = sweep - Math.sign(sweep || 1) * TAU;
      const midOf = (sw) => circularArcAtDistance(center, radius, startAngle, sw, Math.abs(radius * sw), Math.abs(radius * sw) / 2);
      const better = dist(midOf(sweep), apex) <= dist(midOf(altSweep), apex) ? sweep : altSweep;
      const length = Math.abs(radius * better);
      const { points } = distributeOpen(length, (d) => circularArcAtDistance(center, radius, startAngle, better, length, d), requestedSpacing);
      return { points, geometry: { type: "arc", start: shape.start, end: shape.end, curvature: shape.curvature } };
    }
    case "circle": {
      const length = TAU * shape.radius;
      const { points } = distributeClosed(length, (d) => circularArcAtDistance(shape.center, shape.radius, 0, TAU, length, d), requestedSpacing);
      return { points, geometry: { type: "circle", center: shape.center, radius: shape.radius } };
    }
    case "ellipse": {
      const sampler = buildEllipseSampler(shape.center, shape.radiusX, shape.radiusY, shape.rotation, 0, TAU);
      const { points } = distributeClosed(sampler.length, sampler.pointAtDistance, requestedSpacing);
      return { points, geometry: { type: "ellipse", center: shape.center, radiusX: shape.radiusX, radiusY: shape.radiusY, rotation: shape.rotation } };
    }
    case "rectangle":
    case "square": {
      const points = distributeVertexRing(shape.corners, requestedSpacing);
      return {
        points,
        geometry: { type: shape.kind, position: shape.position, width: shape.halfWidth * 2, height: shape.halfHeight * 2, rotation: shape.rotation },
      };
    }
    case "regular-polygon": {
      const vertices = regularPolygonVertices(shape.center, shape.radius, shape.sides, shape.rotation);
      const points = distributeVertexRing(vertices, requestedSpacing);
      return { points, geometry: { type: "regular-polygon", center: shape.center, radius: shape.radius, sides: shape.sides, rotation: shape.rotation } };
    }
    case "star": {
      const vertices = starVertices(shape.center, shape.outerRadius, shape.innerRadius, shape.points, shape.rotation);
      const points = distributeVertexRing(vertices, requestedSpacing);
      return {
        points,
        geometry: { type: "star", center: shape.center, outerRadius: shape.outerRadius, innerRadius: shape.innerRadius, points: shape.points, rotation: shape.rotation },
      };
    }
    case "freehand": {
      const pts = shape.points;
      let total = 0;
      const segLens = [];
      for (let i = 0; i < pts.length - 1; i += 1) {
        const l = dist(pts[i], pts[i + 1]);
        segLens.push(l);
        total += l;
      }
      const pointAtDistance = (d) => {
        let remaining = d;
        for (let i = 0; i < segLens.length; i += 1) {
          if (remaining <= segLens[i] || i === segLens.length - 1) {
            return lineAtDistance(pts[i], pts[i + 1], Math.max(0, remaining), segLens[i]);
          }
          remaining -= segLens[i];
        }
        return pts[pts.length - 1];
      };
      const { points } = distributeOpen(total, pointAtDistance, requestedSpacing);
      return { points, geometry: { type: "freehand", points: pts } };
    }
    default:
      throw new Error(`unhandled shape kind ${shape.kind}`);
  }
}

function orderByAngle(points, centroid) {
  return [...points]
    .map((p) => ({ ...p, angle: normalizeAngle(Math.atan2(p.y - centroid.y, p.x - centroid.x)) }))
    .sort((a, b) => a.angle - b.angle);
}

// Greedy nearest-neighbour chain: repeatedly walk to whichever remaining point is
// closest, instead of a global angle sort. A pure angle sort scatters a multi-lobe
// shape's pins — two points on adjacent petals can share almost the same angle from
// the overall centroid while being far apart in space, and two points genuinely next
// to each other on the same lobe can land far apart in angle order — producing a
// freehand path that zig-zags between lobes instead of tracing the actual shape, i.e.
// pins with no coherent path connecting their real neighbours. Starting from an
// extreme point (max distance from centroid) anchors the walk on the boundary instead
// of an arbitrary interior point.
function orderByNearestNeighbourChain(points, centroid) {
  if (points.length <= 2) return [...points];
  const remaining = points.map((p) => ({ x: p.x, y: p.y }));
  let startIdx = 0;
  let startDist = -Infinity;
  remaining.forEach((p, i) => {
    const d = dist(p, centroid);
    if (d > startDist) {
      startDist = d;
      startIdx = i;
    }
  });
  const ordered = [remaining.splice(startIdx, 1)[0]];
  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const d = dist(last, remaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered;
}

function generateTemplate({ file, id }) {
  const { width, height, lines: allLines } = parseSvg(path.join(SRC_DIR, file));
  // Evenly sample across the WHOLE original sequence rather than truncating to the
  // first N — a straight slice would cut off a large fraction of the design for the
  // densest sources (Lotus/Sun originally have ~2600-3000 lines), leaving only one
  // corner of the drawing instead of the full shape at slightly lower density.
  const step = Math.max(1, Math.ceil(allLines.length / MAX_LINES_PER_TEMPLATE));
  const lines = step === 1 ? allLines : allLines.filter((_, i) => i % step === 0);

  const uniqueMap = new Map();
  for (const l of lines) {
    uniqueMap.set(keyOf(l.x1, l.y1), { x: l.x1, y: l.y1 });
    uniqueMap.set(keyOf(l.x2, l.y2), { x: l.x2, y: l.y2 });
  }
  const uniquePoints = [...uniqueMap.values()];
  const centroid = centroidOf(uniquePoints);
  const rMax = Math.max(...uniquePoints.map((p) => dist(p, centroid))) || 1;

  const symmetry = detectSymmetry(uniquePoints, centroid, rMax);

  const scale = TARGET_LONGEST_EXTENT_CM / Math.max(width, height);
  const toCm = (p) => ({ x: (p.x - centroid.x) * scale, y: (p.y - centroid.y) * scale });
  const round = (v) => Math.round(v * 1000) / 1000;
  const roundPt = (p) => ({ x: round(p.x), y: round(p.y) });

  let basePoints; // points defining the ONE stored PinPath, in original SVG units, centred later
  let armOf; // (point) => arm index (0 = base)
  let symmetryConfig; // SymmetryConfig for pinPath.symmetry
  let closedHint;

  if (symmetry.type === "radial") {
    const clusters = clusterByAngularGaps(uniquePoints, centroid);
    // Sort clusters by their mean angle so arm indices increase monotonically around
    // the circle — required so index (i - baseIndex) mod n matches generateRadialCopies'
    // copy order (copies[0] = +interval, copies[1] = +2*interval, ...).
    const withMeanAngle = clusters.map((c) => ({
      points: c,
      meanAngle: normalizeAngle(Math.atan2(centroidOf(c).y - centroid.y, centroidOf(c).x - centroid.x)),
    }));
    withMeanAngle.sort((a, b) => a.meanAngle - b.meanAngle);
    const baseCluster = withMeanAngle[0];
    basePoints = orderByAngle(baseCluster.points, centroid);
    closedHint = false;
    const interval = (symmetry.intervalDegrees * Math.PI) / 180;
    armOf = (p) => foldIndexRadial(p, centroid, symmetry.n, symmetry.intervalDegrees, baseCluster.meanAngle);
    symmetryConfig = { type: "radial", centre: { x: 0, y: 0 }, intervalDegrees: symmetry.intervalDegrees };
    void interval;
  } else if (symmetry.type === "horizontal" || symmetry.type === "vertical") {
    const isHorizontal = symmetry.type === "horizontal";
    const side = (p) => (isHorizontal ? p.y <= symmetry.axis.y : p.x <= symmetry.axis.x);
    const baseRaw = uniquePoints.filter(side);
    const otherRaw = uniquePoints.filter((p) => !side(p));
    basePoints = (baseRaw.length >= otherRaw.length ? baseRaw : otherRaw).slice();
    const baseIsFirstSide = baseRaw.length >= otherRaw.length;
    basePoints = orderByAngle(basePoints, centroid);
    closedHint = false;
    armOf = (p) => (side(p) === baseIsFirstSide ? 0 : 1);
    symmetryConfig = { type: symmetry.type, axis: { x: 0, y: 0 } };
  } else {
    basePoints = uniquePoints;
    const { cov } = angularCoefficientOfVariation(uniquePoints, centroid);
    closedHint = cov < 1.2; // low variance in angular density => treat as a closed loop
    armOf = () => 0;
    symmetryConfig = { type: "none" };
  }

  const orderedBase = closedHint ? orderByAngle(basePoints, centroid) : basePoints;
  let shape = fitShape(orderedBase, closedHint);
  if (!shape) {
    // The line/circle/ellipse/rectangle/polygon fits above only needed a point SET
    // (order didn't matter), but freehand's points ARE the path — order them by
    // nearest-neighbour chaining, not the angle sort used for shape-fitting, or the
    // resulting Pin Path zig-zags between unrelated points instead of tracing the
    // actual drawn shape (see orderByNearestNeighbourChain).
    const pts = orderByNearestNeighbourChain(basePoints, centroid).map((p) => ({ x: p.x, y: p.y }));
    if (closedHint) pts.push(pts[0]);
    shape = { kind: "freehand", points: pts };
  }

  // Requested spacing chosen so the fitted shape reproduces roughly the same pin
  // density the source drawing shows for this arm/shape.
  const approxLen =
    shape.kind === "line" || shape.kind === "arc"
      ? dist(shape.start, shape.end)
      : shape.kind === "circle"
        ? TAU * shape.radius
        : shape.kind === "ellipse"
          ? Math.PI * (3 * (shape.radiusX + shape.radiusY) - Math.sqrt((3 * shape.radiusX + shape.radiusY) * (shape.radiusX + 3 * shape.radiusY)))
          : shape.kind === "rectangle" || shape.kind === "square"
            ? 2 * (shape.halfWidth + shape.halfHeight) * 2
            : shape.kind === "regular-polygon"
              ? shape.sides * 2 * shape.radius * Math.sin(Math.PI / shape.sides)
              : shape.kind === "star"
                ? regularPolygonPerimeterFromVertices(starVertices(shape.center, shape.outerRadius, shape.innerRadius, shape.points, shape.rotation))
                : shape.points.reduce((s, p, i) => (i === 0 ? 0 : s + dist(p, shape.points[i - 1])), 0);
  const requestedSpacing = Math.max(approxLen / Math.max(orderedBase.length, 8), approxLen / 400);

  const { points: rawPins, geometry: rawGeometry } = buildPinsForShape(shape, requestedSpacing);

  // Rescale shape + pins from SVG pixels to physical cm, centred at (0,0).
  const scalePoint = (p) => roundPt(toCm(p));
  const geometry = scaleGeometry(rawGeometry, scalePoint, scale);
  const basePinIds = rawPins.map((_, i) => `pin-${id}-${i + 1}`);
  const pins = rawPins.map((p, i) => ({ id: basePinIds[i], ...scalePoint(p) }));
  const scaledBasePins = pins.map((p) => ({ x: p.x, y: p.y }));

  // Resolve every original line endpoint to (armIndex, nearest base pin) so threads
  // can reference the base id or its `~mirror-N` derived id, matching how the app
  // itself models a Symmetry-derived pin (application/document/symmetryConfig.ts).
  function resolveEndpoint(p) {
    const arm = armOf(p);
    let folded = p;
    if (symmetry.type === "radial" && arm !== 0) {
      const interval = (symmetry.intervalDegrees * Math.PI) / 180;
      folded = rotateAround(p, centroid, -arm * interval);
    } else if (symmetry.type === "horizontal" && arm !== 0) {
      folded = reflectHorizontal(p, symmetry.axis.y);
    } else if (symmetry.type === "vertical" && arm !== 0) {
      folded = reflectVertical(p, symmetry.axis.x);
    }
    const foldedCm = toCm(folded);
    let bestIdx = 0;
    let bestDist = Infinity;
    scaledBasePins.forEach((bp, i) => {
      const d = dist(bp, foldedCm);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    const pinId = basePinIds[bestIdx];
    return arm === 0 ? pinId : `${pinId}~mirror-${arm - 1}`;
  }

  // Group the original line sequence into contiguous same-colour runs, one ThreadPath
  // per run — matches how these designs are actually authored (draw once, use
  // Symmetry, recolour each resulting arm's thread).
  const threadPaths = [];
  let currentColour = null;
  let currentIds = [];
  let threadCounter = 0;
  const flush = () => {
    if (currentIds.length < 2) return;
    threadCounter += 1;
    threadPaths.push({
      id: `threadpath-${id}-${threadCounter}`,
      colours: [currentColour ?? "#ffffff"],
      width: 0.15,
      pinIds: currentIds,
      twistPitch: 6,
    });
  };
  for (const l of lines) {
    if (l.colour !== currentColour) {
      flush();
      currentColour = l.colour;
      currentIds = [];
    }
    const a = resolveEndpoint({ x: l.x1, y: l.y1 });
    const b = resolveEndpoint({ x: l.x2, y: l.y2 });
    if (currentIds[currentIds.length - 1] !== a) currentIds.push(a);
    currentIds.push(b);
  }
  flush();

  const pinPath = {
    id: `pinpath-${id}-1`,
    geometry,
    requestedSpacing: round(requestedSpacing * scale),
    actualSpacing: round(requestedSpacing * scale),
    pins,
    guideVisible: true,
    colour: "#ffffff",
    diameter: 0.25,
    symmetry: symmetryConfig,
  };

  const isSquareish = Math.abs(width - height) / Math.max(width, height) < 0.08;
  const longSideCm = TARGET_LONGEST_EXTENT_CM;
  const shortSideCm = round(longSideCm * (Math.min(width, height) / Math.max(width, height)));
  const board = isSquareish
    ? { shape: "circle", dimensions: { diameter: longSideCm }, appearance: { type: "solid", colour: "#101010" } }
    : {
        shape: "oval",
        dimensions: width >= height ? { width: longSideCm, height: shortSideCm } : { width: shortSideCm, height: longSideCm },
        appearance: { type: "solid", colour: "#101010" },
      };

  const projectFile = {
    version: 1,
    board,
    grid: { gapX: 1, gapY: 1, colour: "#6d5ef7", opacity: 0.6 },
    pinLayers: [{ id: `pinlayer-${id}-1`, name: "Layer 1", visible: true, locked: false, pinPaths: [pinPath] }],
    threadLayers: [{ id: `threadlayer-${id}-1`, name: "Layer 1", visible: true, locked: false, threadPaths }],
  };

  return { id, projectFile, symmetry, shapeKind: shape.kind, pinCount: pins.length, threadCount: threadPaths.length };
}

function scaleGeometry(geometry, scalePoint, scale) {
  switch (geometry.type) {
    case "line":
      return { type: "line", start: scalePoint(geometry.start), end: scalePoint(geometry.end) };
    case "arc":
      return { type: "arc", start: scalePoint(geometry.start), end: scalePoint(geometry.end), curvature: Math.round(geometry.curvature * scale * 1000) / 1000 };
    case "circle":
      return { type: "circle", center: scalePoint(geometry.center), radius: Math.round(geometry.radius * scale * 1000) / 1000 };
    case "ellipse":
      return {
        type: "ellipse",
        center: scalePoint(geometry.center),
        radiusX: Math.round(geometry.radiusX * scale * 1000) / 1000,
        radiusY: Math.round(geometry.radiusY * scale * 1000) / 1000,
        rotation: geometry.rotation,
      };
    case "rectangle":
    case "square":
      return { type: geometry.type, position: scalePoint(geometry.position), width: Math.round(geometry.width * scale * 1000) / 1000, height: Math.round(geometry.height * scale * 1000) / 1000, rotation: geometry.rotation };
    case "regular-polygon":
      return { type: "regular-polygon", center: scalePoint(geometry.center), radius: Math.round(geometry.radius * scale * 1000) / 1000, sides: geometry.sides, rotation: geometry.rotation };
    case "star":
      return {
        type: "star",
        center: scalePoint(geometry.center),
        outerRadius: Math.round(geometry.outerRadius * scale * 1000) / 1000,
        innerRadius: Math.round(geometry.innerRadius * scale * 1000) / 1000,
        points: geometry.points,
        rotation: geometry.rotation,
      };
    case "freehand":
      return { type: "freehand", points: geometry.points.map(scalePoint) };
    default:
      throw new Error(`cannot scale geometry ${geometry.type}`);
  }
}

function main() {
  const available = new Set(readdirSync(SRC_DIR));
  mkdirSync(OUT_DIR, { recursive: true });
  for (const t of TEMPLATES) {
    if (!available.has(t.file)) {
      console.warn(`skip ${t.file}: not found in ${SRC_DIR}`);
      continue;
    }
    const result = generateTemplate(t);
    writeFileSync(path.join(OUT_DIR, `${t.id}.json`), JSON.stringify(result.projectFile, null, 2), "utf-8");
    console.log(
      `${t.id}: symmetry=${JSON.stringify(result.symmetry).slice(0, 60)} shape=${result.shapeKind} pins=${result.pinCount} threadPaths=${result.threadCount}`,
    );
  }
}

main();
