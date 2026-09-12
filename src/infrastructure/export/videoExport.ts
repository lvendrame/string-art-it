import { loadImage } from "./rasterExport";

export function pickSupportedVideoMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

export interface VideoRecordingOptions {
  widthPx: number;
  heightPx: number;
  fps: number;
  mimeType: string;
  totalFrames: number;
  intervalMs: number;
  drawFrame: (frameIndex: number, ctx: CanvasRenderingContext2D) => Promise<void>;
  onProgress?: (frameIndex: number) => void;
}

// docs/specs/19-play-mode.md Export to Video — draws each frame onto a hidden canvas
// at the SAME pace as on-screen playback (one `intervalMs` dwell per frame) and lets
// MediaRecorder's automatic captureStream sampling pick up whatever is currently
// drawn. This is the standard, reliable technique (vs. manually driving
// CanvasCaptureMediaStreamTrack.requestFrame(), which has spottier browser support) —
// the exported video's duration equals totalFrames * intervalMs, matching what
// pressing Play would show.
export async function recordFramesToVideo(options: VideoRecordingOptions): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = options.widthPx;
  canvas.height = options.heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  const stream = canvas.captureStream(options.fps);
  const recorder = new MediaRecorder(stream, { mimeType: options.mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();
  for (let frame = 1; frame <= options.totalFrames; frame += 1) {
    const started = performance.now();
    await options.drawFrame(frame, ctx);
    options.onProgress?.(frame);
    await sleep(Math.max(options.intervalMs - (performance.now() - started), 0));
  }
  recorder.stop();
  await stopped;

  return new Blob(chunks, { type: options.mimeType });
}

// Rasterizes one SVG element's current DOM state onto a 2D canvas context — reused
// per animation frame so the exported video matches the live Play-mode preview
// exactly (full multi-colour/twist thread rendering), rather than re-deriving markup
// through the simpler single-colour buildExportSvg used by static SVG/PNG/PDF export.
export async function drawSvgElementToCanvas(svg: SVGSVGElement, ctx: CanvasRenderingContext2D, widthPx: number, heightPx: number): Promise<void> {
  const markup = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([markup], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    ctx.clearRect(0, 0, widthPx, heightPx);
    ctx.drawImage(image, 0, 0, widthPx, heightPx);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
