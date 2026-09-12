import { ChevronLeft, ChevronRight, Pause, Play as PlayIcon, SkipBack, SkipForward, Video } from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import type { PlaybackTransport } from "./usePlaybackTransport";

const PLAY_TOOLBAR_TOOLTIP_ID = "play-toolbar-tooltip";

interface VideoExportState {
  isExporting: boolean;
  progress: number;
  supported: boolean;
  exportVideo: () => Promise<void>;
}

const STEP_BUTTON_STYLE = { justifyContent: "center", borderRadius: "var(--radius-sm)", padding: 9 };
const NUMBER_INPUT_STYLE = { width: 70, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "4px 6px" };

// docs/specs/19-play-mode.md — the Play-mode transport panel. One row of 5, matching
// the standard media-player convention (YouTube/Spotify/VLC): stepping controls
// symmetric around a single, visually dominant Play/Pause toggle. No separate Stop —
// First already does exactly what Stop would (pause + reset to frame 0), so a
// distinct Stop button would just be a second control with identical behaviour.
export function PlayToolbar({ transport, totalFrames, videoExport }: { transport: PlaybackTransport; totalFrames: number; videoExport: VideoExportState }) {
  const disabled = videoExport.isExporting || totalFrames === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        Play
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <button className="btn" disabled={disabled} onClick={transport.first} aria-label="First frame" data-tooltip-id={PLAY_TOOLBAR_TOOLTIP_ID} data-tooltip-content="First frame" style={STEP_BUTTON_STYLE}>
          <SkipBack size={15} />
        </button>
        <button className="btn" disabled={disabled} onClick={transport.previous} aria-label="Previous frame" data-tooltip-id={PLAY_TOOLBAR_TOOLTIP_ID} data-tooltip-content="Previous frame" style={STEP_BUTTON_STYLE}>
          <ChevronLeft size={15} />
        </button>
        <button
          className={`btn${transport.isPlaying ? " btn-active" : ""}`}
          disabled={disabled}
          onClick={() => (transport.isPlaying ? transport.pause() : transport.play())}
          aria-label={transport.isPlaying ? "Pause" : "Play"}
          data-tooltip-id={PLAY_TOOLBAR_TOOLTIP_ID}
          data-tooltip-content={transport.isPlaying ? "Pause" : totalFrames > 0 && transport.frame >= totalFrames ? "Play (restarts from the beginning)" : "Play"}
          style={{ justifyContent: "center", borderRadius: "var(--radius-md)", padding: 12, ...(transport.isPlaying ? {} : { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }) }}
        >
          {transport.isPlaying ? <Pause size={20} /> : <PlayIcon size={20} />}
        </button>
        <button className="btn" disabled={disabled} onClick={transport.next} aria-label="Next frame" data-tooltip-id={PLAY_TOOLBAR_TOOLTIP_ID} data-tooltip-content="Next frame" style={STEP_BUTTON_STYLE}>
          <ChevronRight size={15} />
        </button>
        <button className="btn" disabled={disabled} onClick={transport.last} aria-label="Last frame" data-tooltip-id={PLAY_TOOLBAR_TOOLTIP_ID} data-tooltip-content="Last frame" style={STEP_BUTTON_STYLE}>
          <SkipForward size={15} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
          Frame
          <input
            type="number"
            className="mono"
            min={0}
            max={totalFrames}
            value={transport.frame}
            disabled={disabled}
            onChange={(e) => transport.goToFrame(Number(e.target.value))}
            style={NUMBER_INPUT_STYLE}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
          Total
          <input type="number" className="mono" value={totalFrames} readOnly style={{ ...NUMBER_INPUT_STYLE, color: "var(--text-tertiary)" }} />
        </label>
      </div>

      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
        Time between frames (ms)
        <input
          type="number"
          className="mono"
          min={1}
          value={transport.intervalMs}
          onChange={(e) => transport.setIntervalMs(Math.max(1, Number(e.target.value)))}
          style={NUMBER_INPUT_STYLE}
        />
      </label>

      <button
        className="btn"
        disabled={disabled || !videoExport.supported}
        onClick={() => void videoExport.exportVideo()}
        style={{ justifyContent: "center", borderRadius: "var(--radius-sm)", padding: 9, fontSize: 12, fontWeight: 600, gap: 6 }}
      >
        <Video size={14} />
        {videoExport.isExporting ? `Exporting… ${videoExport.progress}/${totalFrames}` : "Export to Video"}
      </button>
      {!videoExport.supported && (
        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Video export isn't supported in this browser.</div>
      )}

      <Tooltip id={PLAY_TOOLBAR_TOOLTIP_ID} place="top" />
    </div>
  );
}
