import { useEffect } from "react";
import {
  geometryCenter,
  recomputePinPath,
  rotateGeometry,
  scaleGeometry,
  translateGeometry,
  type EditorStore,
} from "../../application/document";
import { rotatePoint, screenDistanceToDocument, translatePoint } from "../../domain/transforms";
import { isTextEntryTarget } from "../keyboard";
import { MIN_SCALE_FACTOR } from "./useScaleTool";

const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

// docs/specs/23-keyboard-transform.md — same initial-delay-then-repeat-rate values as
// WPF/UWP's RepeatButton (a de facto standard for "hold to repeat" controls across UI
// toolkits): 500ms before the first repeat, then every 100ms until the key is released.
// This is a HOMEGROWN repeat loop, not the browser's native `event.repeat` auto-fire —
// the OS's own key-repeat delay/rate is user-configurable and wildly inconsistent
// across machines, which would make the nudge feel different for every user. Native
// repeat keydown events are therefore ignored entirely; our own setTimeout/setInterval
// pair is the only thing driving repeated presses.
const REPEAT_DELAY_MS = 500;
const REPEAT_INTERVAL_MS = 100;

interface HeldKey {
  key: string;
  big: boolean;
  timeoutId: ReturnType<typeof setTimeout> | null;
  intervalId: ReturnType<typeof setInterval> | null;
}

// docs/specs/23-keyboard-transform.md — arrow-key nudge of the selected Pin Path,
// driven by whichever of Move/Rotation/Scale is the currently active Edit tool. Each
// press (and each auto-repeat tick) commits one undo step immediately (no drag/preview
// phase, unlike the mouse tools this reuses the commit methods of). Rotate/Scale always
// pivot on the shape's own centroid (geometryCenter), unlike the mouse Rotation tool's
// external press-point pivot.
export function useKeyboardTransform(store: EditorStore) {
  useEffect(() => {
    const held = { current: null as HeldKey | null };

    function clearHeld(): void {
      if (!held.current) return;
      if (held.current.timeoutId !== null) clearTimeout(held.current.timeoutId);
      if (held.current.intervalId !== null) clearInterval(held.current.intervalId);
      held.current = null;
    }

    // Re-reads live state on every call (initial press AND every repeat tick) so a
    // mid-hold change (Undo, tool switch, layer lock, deselection) is respected
    // immediately rather than replaying against stale gesture-start state. Returns
    // whether it actually fired, so the caller knows whether to arm/keep the repeat.
    function applyTransform(key: string, big: boolean): boolean {
      const state = store.getState();
      if (state.mode !== "select" || state.selection.type !== "pinPath") return false;
      const { layerId, pathId } = state.selection;
      const path = store.getSelectedPinPath();
      if (!path) return false;

      const step = big ? 10 : 1;

      if (state.selectTool === "move") {
        const distance = screenDistanceToDocument(step, state.viewport);
        const delta =
          key === "ArrowLeft"
            ? { x: -distance, y: 0 }
            : key === "ArrowRight"
              ? { x: distance, y: 0 }
              : key === "ArrowUp"
                ? { x: 0, y: -distance }
                : { x: 0, y: distance };
        const geometry = translateGeometry(path.geometry, delta);
        const pins = path.pins.map((p) => ({ ...p, ...translatePoint(p, delta) }));
        store.commitPinPathTransform(layerId, pathId, geometry, pins, state.pinLayers);
        return true;
      }
      if (state.selectTool === "rotate") {
        const sign = key === "ArrowUp" || key === "ArrowLeft" ? -1 : 1;
        const theta = (sign * step * Math.PI) / 180;
        const pivot = geometryCenter(path.geometry);
        const geometry = rotateGeometry(path.geometry, pivot, theta);
        const pins = path.pins.map((p) => ({ ...p, ...rotatePoint(p, pivot, theta) }));
        store.commitPinPathTransform(layerId, pathId, geometry, pins, state.pinLayers);
        return true;
      }
      if (state.selectTool === "scale") {
        const sign = key === "ArrowUp" || key === "ArrowRight" ? 1 : -1;
        const factor = Math.max(1 + (sign * step) / 100, MIN_SCALE_FACTOR);
        const geometry = scaleGeometry(path.geometry, factor);
        const newPinPath = recomputePinPath({ ...path, geometry });
        store.commitPinPathScale(layerId, pathId, newPinPath, { pinLayers: state.pinLayers, threadLayers: state.threadLayers });
        return true;
      }
      return false;
    }

    function onKeyDown(e: KeyboardEvent): void {
      if (!ARROW_KEYS.has(e.key)) return;
      if (e.repeat || isTextEntryTarget(e.target)) return;

      const big = e.shiftKey;
      const fired = applyTransform(e.key, big);
      if (!fired) return;
      e.preventDefault();

      clearHeld(); // only one key auto-repeats at a time — last one pressed wins
      const timeoutId = setTimeout(() => {
        const intervalId = setInterval(() => {
          if (!applyTransform(e.key, big)) clearHeld(); // gating failed mid-hold: stop quietly
        }, REPEAT_INTERVAL_MS);
        if (held.current) held.current.intervalId = intervalId;
      }, REPEAT_DELAY_MS);
      held.current = { key: e.key, big, timeoutId, intervalId: null };
    }

    function onKeyUp(e: KeyboardEvent): void {
      if (held.current?.key === e.key) clearHeld();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearHeld); // e.g. Alt-Tab away mid-hold: don't leak a runaway interval
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearHeld);
      clearHeld();
    };
  }, [store]);
}
