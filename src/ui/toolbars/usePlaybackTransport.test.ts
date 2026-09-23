import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlaybackTransport } from "./usePlaybackTransport";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("usePlaybackTransport", () => {
  it("always starts at frame 0 (nothing drawn), regardless of total frames", () => {
    const { result: withFrames } = renderHook(() => usePlaybackTransport(5, true));
    expect(withFrames.current.frame).toBe(0);

    const { result: noFrames } = renderHook(() => usePlaybackTransport(0, true));
    expect(noFrames.current.frame).toBe(0);
  });

  it("play advances one frame per interval tick and stops (no loop) at the last frame", () => {
    const { result } = renderHook(() => usePlaybackTransport(3, true));
    act(() => result.current.play());
    expect(result.current.isPlaying).toBe(true);

    act(() => vi.advanceTimersByTime(150));
    expect(result.current.frame).toBe(1);
    act(() => vi.advanceTimersByTime(150));
    expect(result.current.frame).toBe(2);
    act(() => vi.advanceTimersByTime(150));
    expect(result.current.frame).toBe(3);
    // At the last frame, playback stops instead of looping back to 0.
    act(() => vi.advanceTimersByTime(150));
    expect(result.current.frame).toBe(3);
    expect(result.current.isPlaying).toBe(false);
  });

  it("pressing Play again at the last frame restarts from 0, like a media player", () => {
    const { result } = renderHook(() => usePlaybackTransport(3, true));
    act(() => result.current.last());
    expect(result.current.frame).toBe(3);

    act(() => result.current.play());
    expect(result.current.frame).toBe(0);
    expect(result.current.isPlaying).toBe(true);

    act(() => vi.advanceTimersByTime(150));
    expect(result.current.frame).toBe(1);
  });

  it("pause halts advancing without resetting the frame", () => {
    const { result } = renderHook(() => usePlaybackTransport(5, true));
    act(() => result.current.play());
    act(() => vi.advanceTimersByTime(150));
    expect(result.current.frame).toBe(1);
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.frame).toBe(1);
    expect(result.current.isPlaying).toBe(false);
  });

  it("first resets to frame 0 and pauses while playing (no separate Stop button)", () => {
    const { result } = renderHook(() => usePlaybackTransport(5, true));
    act(() => result.current.play());
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.frame).toBe(2);
    act(() => result.current.first());
    expect(result.current.frame).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });

  it("first/previous/next/last clamp to [0, totalFrames]", () => {
    const { result } = renderHook(() => usePlaybackTransport(4, true));
    act(() => result.current.goToFrame(2));
    act(() => result.current.previous());
    expect(result.current.frame).toBe(1);
    act(() => result.current.previous());
    expect(result.current.frame).toBe(0);
    act(() => result.current.previous()); // already at 0, stays clamped
    expect(result.current.frame).toBe(0);
    act(() => result.current.last());
    expect(result.current.frame).toBe(4);
    act(() => result.current.next()); // already at last, stays clamped
    expect(result.current.frame).toBe(4);
    act(() => result.current.first());
    expect(result.current.frame).toBe(0);
  });

  it("clamps a stale frame when totalFrames shrinks", () => {
    const { result, rerender } = renderHook(({ total }) => usePlaybackTransport(total, true), { initialProps: { total: 10 } });
    act(() => result.current.goToFrame(8));
    expect(result.current.frame).toBe(8);
    rerender({ total: 3 });
    expect(result.current.frame).toBe(3);
  });

  it("entering Play mode (active flips true) resets to frame 0, paused", () => {
    const { result, rerender } = renderHook(({ active }) => usePlaybackTransport(5, active), { initialProps: { active: false } });
    act(() => result.current.goToFrame(4));
    expect(result.current.frame).toBe(4);
    rerender({ active: true });
    expect(result.current.frame).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });

  it("leaving Play mode (active flips false) doesn't reset the frame", () => {
    const { result, rerender } = renderHook(({ active }) => usePlaybackTransport(5, active), { initialProps: { active: true } });
    act(() => result.current.goToFrame(3));
    expect(result.current.frame).toBe(3);
    rerender({ active: false });
    expect(result.current.frame).toBe(3);
  });

  it("play is a no-op when there are no frames to play", () => {
    const { result } = renderHook(() => usePlaybackTransport(0, true));
    act(() => result.current.play());
    expect(result.current.isPlaying).toBe(false);
  });
});
