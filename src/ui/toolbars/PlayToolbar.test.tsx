import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlaybackTransport } from "./usePlaybackTransport";
import { PlayToolbar } from "./PlayToolbar";

function fakeTransport(overrides: Partial<PlaybackTransport> = {}): PlaybackTransport {
  return {
    frame: 0,
    isPlaying: false,
    intervalMs: 150,
    setIntervalMs: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    goToFrame: vi.fn(),
    first: vi.fn(),
    previous: vi.fn(),
    next: vi.fn(),
    last: vi.fn(),
    ...overrides,
  };
}

function fakeVideoExport(overrides: Partial<PlayToolbarVideoExport> = {}): PlayToolbarVideoExport {
  return { isExporting: false, progress: 0, supported: true, exportVideo: vi.fn().mockResolvedValue(undefined), ...overrides };
}

type PlayToolbarVideoExport = { isExporting: boolean; progress: number; supported: boolean; exportVideo: () => Promise<void> };

describe("PlayToolbar", () => {
  it("First/Previous/Next/Last buttons call the matching transport method", () => {
    const transport = fakeTransport();
    render(<PlayToolbar transport={transport} totalFrames={10} videoExport={fakeVideoExport()} />);

    fireEvent.click(screen.getByRole("button", { name: "First frame" }));
    expect(transport.first).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Previous frame" }));
    expect(transport.previous).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Next frame" }));
    expect(transport.next).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Last frame" }));
    expect(transport.last).toHaveBeenCalledTimes(1);
  });

  it("clicking Play while paused calls play(); clicking Pause while playing calls pause()", () => {
    const transport = fakeTransport({ isPlaying: false });
    const { rerender } = render(<PlayToolbar transport={transport} totalFrames={10} videoExport={fakeVideoExport()} />);

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(transport.play).toHaveBeenCalledTimes(1);

    const playing = fakeTransport({ isPlaying: true, play: transport.play, pause: transport.pause });
    rerender(<PlayToolbar transport={playing} totalFrames={10} videoExport={fakeVideoExport()} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(transport.pause).toHaveBeenCalledTimes(1);
  });

  it("the Play button's tooltip says Restart once the last frame has been reached", () => {
    const transport = fakeTransport({ frame: 10 });
    render(<PlayToolbar transport={transport} totalFrames={10} videoExport={fakeVideoExport()} />);
    expect(screen.getByRole("button", { name: "Play" })).toHaveAttribute("data-tooltip-content", "Play (restarts from the beginning) [Space]");
  });

  it("the Play button's tooltip says Play before the last frame", () => {
    const transport = fakeTransport({ frame: 3 });
    render(<PlayToolbar transport={transport} totalFrames={10} videoExport={fakeVideoExport()} />);
    expect(screen.getByRole("button", { name: "Play" })).toHaveAttribute("data-tooltip-content", "Play [Space]");
  });

  it("all transport controls are disabled when there are no frames", () => {
    const transport = fakeTransport();
    render(<PlayToolbar transport={transport} totalFrames={0} videoExport={fakeVideoExport()} />);
    expect(screen.getByRole("button", { name: "First frame" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
  });

  it("all transport controls are disabled while a video export is in progress", () => {
    const transport = fakeTransport();
    render(<PlayToolbar transport={transport} totalFrames={10} videoExport={fakeVideoExport({ isExporting: true })} />);
    expect(screen.getByRole("button", { name: "First frame" })).toBeDisabled();
  });

  it("changing the Frame input calls goToFrame", () => {
    const transport = fakeTransport();
    render(<PlayToolbar transport={transport} totalFrames={10} videoExport={fakeVideoExport()} />);
    fireEvent.change(screen.getByLabelText("Frame"), { target: { value: "4" } });
    expect(transport.goToFrame).toHaveBeenCalledWith(4);
  });

  it("shows the read-only total frame count", () => {
    const transport = fakeTransport();
    render(<PlayToolbar transport={transport} totalFrames={42} videoExport={fakeVideoExport()} />);
    expect(screen.getByLabelText("Total")).toHaveValue(42);
    expect(screen.getByLabelText("Total")).toHaveAttribute("readonly");
  });

  it("changing the interval clamps to a minimum of 1ms", () => {
    const transport = fakeTransport();
    render(<PlayToolbar transport={transport} totalFrames={10} videoExport={fakeVideoExport()} />);
    fireEvent.change(screen.getByLabelText("Time between frames (ms)"), { target: { value: "-5" } });
    expect(transport.setIntervalMs).toHaveBeenCalledWith(1);
  });

  it("Export to Video button calls exportVideo", () => {
    const videoExport = fakeVideoExport();
    render(<PlayToolbar transport={fakeTransport()} totalFrames={10} videoExport={videoExport} />);
    fireEvent.click(screen.getByRole("button", { name: /Export to Video/ }));
    expect(videoExport.exportVideo).toHaveBeenCalledTimes(1);
  });

  it("shows exporting progress text and disables the export button while exporting", () => {
    render(<PlayToolbar transport={fakeTransport()} totalFrames={10} videoExport={fakeVideoExport({ isExporting: true, progress: 4 })} />);
    expect(screen.getByText("Exporting… 4/10")).toBeInTheDocument();
  });

  it("shows an unsupported note and disables the export button when video export isn't supported", () => {
    render(<PlayToolbar transport={fakeTransport()} totalFrames={10} videoExport={fakeVideoExport({ supported: false })} />);
    expect(screen.getByRole("button", { name: /Export to Video/ })).toBeDisabled();
    expect(screen.getByText(/isn't supported/i)).toBeInTheDocument();
  });
});
