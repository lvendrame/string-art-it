import { ChevronLeft, ChevronRight, Pause, Play as PlayIcon, SkipBack, SkipForward, Video } from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { useTranslation } from "react-i18next";
import type { PlaybackTransport } from "./usePlaybackTransport";
import "./PlayToolbar.css";

const PLAY_TOOLBAR_TOOLTIP_ID = "play-toolbar-tooltip";

interface VideoExportState {
  isExporting: boolean;
  progress: number;
  supported: boolean;
  exportVideo: () => Promise<void>;
}

// docs/specs/19-play-mode.md — the Play-mode transport panel. One row of 5, matching
// the standard media-player convention (YouTube/Spotify/VLC): stepping controls
// symmetric around a single, visually dominant Play/Pause toggle. No separate Stop —
// First already does exactly what Stop would (pause + reset to frame 0), so a
// distinct Stop button would just be a second control with identical behaviour.
export function PlayToolbar({ transport, totalFrames, videoExport }: { transport: PlaybackTransport; totalFrames: number; videoExport: VideoExportState }) {
  const { t } = useTranslation("toolbars");
  const disabled = videoExport.isExporting || totalFrames === 0;

  return (
    <div className="play-toolbar">
      <div className="play-toolbar__section-title">{t("playToolbar.sectionTitle")}</div>

      <div className="play-toolbar__transport-row">
        <button
          className="btn play-toolbar__step-btn"
          disabled={disabled}
          onClick={transport.first}
          aria-label={t("playToolbar.firstFrame")}
          data-tooltip-id={PLAY_TOOLBAR_TOOLTIP_ID}
          data-tooltip-content={`${t("playToolbar.firstFrame")} [F]`}
        >
          <SkipBack size={15} />
        </button>
        <button
          className="btn play-toolbar__step-btn"
          disabled={disabled}
          onClick={transport.previous}
          aria-label={t("playToolbar.previousFrame")}
          data-tooltip-id={PLAY_TOOLBAR_TOOLTIP_ID}
          data-tooltip-content={`${t("playToolbar.previousFrame")} [P]`}
        >
          <ChevronLeft size={15} />
        </button>
        <button
          className={`btn play-toolbar__transport-toggle${transport.isPlaying ? " btn-active" : " play-toolbar__transport-toggle--ready"}`}
          disabled={disabled}
          onClick={() => (transport.isPlaying ? transport.pause() : transport.play())}
          aria-label={transport.isPlaying ? t("playToolbar.pause") : t("playToolbar.play")}
          data-tooltip-id={PLAY_TOOLBAR_TOOLTIP_ID}
          data-tooltip-content={`${transport.isPlaying ? t("playToolbar.pause") : totalFrames > 0 && transport.frame >= totalFrames ? t("playToolbar.playRestart") : t("playToolbar.play")} [Space]`}
        >
          {transport.isPlaying ? <Pause size={20} /> : <PlayIcon size={20} />}
        </button>
        <button
          className="btn play-toolbar__step-btn"
          disabled={disabled}
          onClick={transport.next}
          aria-label={t("playToolbar.nextFrame")}
          data-tooltip-id={PLAY_TOOLBAR_TOOLTIP_ID}
          data-tooltip-content={`${t("playToolbar.nextFrame")} [N]`}
        >
          <ChevronRight size={15} />
        </button>
        <button
          className="btn play-toolbar__step-btn"
          disabled={disabled}
          onClick={transport.last}
          aria-label={t("playToolbar.lastFrame")}
          data-tooltip-id={PLAY_TOOLBAR_TOOLTIP_ID}
          data-tooltip-content={`${t("playToolbar.lastFrame")} [L]`}
        >
          <SkipForward size={15} />
        </button>
      </div>

      <div className="play-toolbar__frame-row">
        <label className="play-toolbar__frame-label">
          {t("playToolbar.frame")}
          <input
            type="number"
            className="mono play-toolbar__number-input"
            min={0}
            max={totalFrames}
            value={transport.frame}
            disabled={disabled}
            onChange={(e) => transport.goToFrame(Number(e.target.value))}
          />
        </label>
        <label className="play-toolbar__frame-label">
          {t("playToolbar.total")}
          <input
            type="number"
            className="mono play-toolbar__number-input play-toolbar__number-input--readonly"
            value={totalFrames}
            readOnly
          />
        </label>
      </div>

      <label className="play-toolbar__interval-row">
        {t("playToolbar.timeBetweenFrames")}
        <input
          type="number"
          className="mono play-toolbar__number-input"
          min={1}
          value={transport.intervalMs}
          onChange={(e) => transport.setIntervalMs(Math.max(1, Number(e.target.value)))}
        />
      </label>

      <button
        className="btn play-toolbar__export-btn"
        disabled={disabled || !videoExport.supported}
        onClick={() => void videoExport.exportVideo()}
      >
        <Video size={14} />
        {videoExport.isExporting ? t("playToolbar.exporting", { progress: videoExport.progress, total: totalFrames }) : `${t("playToolbar.exportToVideo")} [Shift+E]`}
      </button>
      {!videoExport.supported && <div className="play-toolbar__unsupported-note">{t("playToolbar.videoNotSupported")}</div>}

      <Tooltip id={PLAY_TOOLBAR_TOOLTIP_ID} place="top" />
    </div>
  );
}
