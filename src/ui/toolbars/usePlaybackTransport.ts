import { useEffect, useState } from "react";

export interface PlaybackTransport {
  frame: number;
  isPlaying: boolean;
  intervalMs: number;
  setIntervalMs: (ms: number) => void;
  play: () => void;
  pause: () => void;
  goToFrame: (frame: number) => void;
  first: () => void;
  previous: () => void;
  next: () => void;
  last: () => void;
}

const DEFAULT_INTERVAL_MS = 150;

// docs/specs/19-play-mode.md — frames are numbered 0..totalFrames (frame N = "the
// first N segments are drawn"). Frame 0 is the true starting state — nothing drawn —
// and is always valid, even when totalFrames is 0 (no threads yet). `active` is
// `state.mode === "play"`; entering Play mode always resets to frame 0, paused,
// regardless of where playback was left off last time (this hook lives in
// EditorShell, which never unmounts, so state would otherwise silently persist
// across mode switches).
export function usePlaybackTransport(totalFrames: number, active: boolean): PlaybackTransport {
  const [frame, setFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [intervalMs, setIntervalMs] = useState(DEFAULT_INTERVAL_MS);

  // "Adjusting state when a prop changes" (react.dev) — setState called directly
  // during render (not inside an effect) when a tracked previous value differs from
  // the current prop, so the clamp/reset lands in the SAME render instead of causing
  // an extra cascading one.
  const [prevTotalFrames, setPrevTotalFrames] = useState(totalFrames);
  const [prevActive, setPrevActive] = useState(active);

  if (totalFrames !== prevTotalFrames) {
    setPrevTotalFrames(totalFrames);
    // Clamp whenever the document's frame count changes (New/Open) — a stale frame
    // index would slice threadLayers incorrectly.
    setFrame((f) => Math.min(Math.max(f, 0), totalFrames));
  }
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) {
      setIsPlaying(false);
      setFrame(0);
    }
  }

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setFrame((f) => {
        if (f >= totalFrames) {
          setIsPlaying(false);
          return f;
        }
        return f + 1;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [isPlaying, intervalMs, totalFrames]);

  function goToFrame(next: number) {
    setIsPlaying(false);
    setFrame(Math.min(Math.max(next, 0), totalFrames));
  }

  return {
    frame,
    isPlaying,
    intervalMs,
    setIntervalMs,
    // Pressing Play at (or past) the last frame restarts from the beginning, matching
    // standard media-player convention — otherwise there'd be nothing left to advance.
    play: () => {
      if (totalFrames <= 0) return;
      if (frame >= totalFrames) setFrame(0);
      setIsPlaying(true);
    },
    pause: () => setIsPlaying(false),
    goToFrame,
    first: () => goToFrame(0),
    previous: () => goToFrame(frame - 1),
    next: () => goToFrame(frame + 1),
    last: () => goToFrame(totalFrames),
  };
}
