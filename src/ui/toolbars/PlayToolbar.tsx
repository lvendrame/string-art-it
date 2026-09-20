import { ChevronLeft, ChevronRight, Pause, Play as PlayIcon, SkipBack, SkipForward, Video } from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("toolbars");
  const disabled = videoExport.isExporting || totalFrames === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        {t("playToolbar.sectionTitle")}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <button className="btn" disabled={disabled} onClick={transport.first} aria-label={t("playToolbar.firstFrame")} data-tooltip-id={PLAY_TOOLBAR_TOOLTIP_ID} data-tooltip-content={`${t("playToolbar.firstFrame")} [F]`} style={STEP_BUTTON_STYLE}>
          <SkipBack size={15} />
        </button>
        <button className="btn" disabled={disabled} onClick={transport.previous} aria-label={t("playToolbar.previousFrame")} data-tooltip-id={PLAY_TOOLBAR_TOOLTIP_ID} data-tooltip-content={`${t("playToolbar.previousFrame")} [P]`} style={STEP_BUTTON_STYLE}>
          <ChevronLeft size={15} />
        </button>
        <button
          className={`btn${transport.isPlaying ? " btn-active" : ""}`}
          disabled={disabled}
          onClick={() => (transport.isPlaying ? transport.pause() : transport.play())}
          aria-label={transport.isPlaying ? t("playToolbar.pause") : t("playToolbar.play")}
          data-tooltip-id={PLAY_TOOLBAR_TOOLTIP_ID}
          data-tooltip-content={`${transport.isPlaying ? t("playToolbar.pause") : totalFrames > 0 && transport.frame >= totalFrames ? t("playToolbar.playRestart") : t("playToolbar.play")} [Space]`}
          style={{ justifyContent: "center", borderRadius: "var(--radius-md)", padding: 12, ...(transport.isPlaying ? {} : { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }) }}
        >
          {transport.isPlaying ? <Pause size={20} /> : <PlayIcon size={20} />}
        </button>
        <button className="btn" disabled={disabled} onClick={transport.next} aria-label={t("playToolbar.nextFrame")} data-tooltip-id={PLAY_TOOLBAR_TOOLTIP_ID} data-tooltip-content={`${t("playToolbar.nextFrame")} [N]`} style={STEP_BUTTON_STYLE}>
          <ChevronRight size={15} />
        </button>
        <button className="btn" disabled={disabled} onClick={transport.last} aria-label={t("playToolbar.lastFrame")} data-tooltip-id={PLAY_TOOLBAR_TOOLTIP_ID} data-tooltip-content={`${t("playToolbar.lastFrame")} [L]`} style={STEP_BUTTON_STYLE}>
          <SkipForward size={15} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
          {t("playToolbar.frame")}
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
          {t("playToolbar.total")}
          <input type="number" className="mono" value={totalFrames} readOnly style={{ ...NUMBER_INPUT_STYLE, color: "var(--text-tertiary)" }} />
        </label>
      </div>

      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
        {t("playToolbar.timeBetweenFrames")}
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
        {videoExport.isExporting ? t("playToolbar.exporting", { progress: videoExport.progress, total: totalFrames }) : `${t("playToolbar.exportToVideo")} [Shift+E]`}
      </button>
      {!videoExport.supported && (
        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{t("playToolbar.videoNotSupported")}</div>
      )}

      <Tooltip id={PLAY_TOOLBAR_TOOLTIP_ID} place="top" />
    </div>
  );
}
