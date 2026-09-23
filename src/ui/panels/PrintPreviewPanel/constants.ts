import { CSS_PIXELS_PER_CM } from "../../../domain/transforms";

// docs/specs/14-printing.md — printed/on-screen-preview pages both use the CSS
// reference-pixel/cm ratio (96dpi ÷ 2.54, same anchor as the editor zoom baseline) so
// what prints is physically true to the selected paper size, not an arbitrary UI scale.
export const PRINT_PX_PER_CM = CSS_PIXELS_PER_CM;
export const CALIBRATION_LENGTH_CM = 10;
export const MIN_PIN_DOT_RADIUS_PX = 1.5;
export const MIN_PIN_NUMBER_FONT_PX = 7;
export const PIN_NUMBER_GAP_PX = 4;
export const MIN_GRID_STROKE_PX = 1;
export const GRID_OPACITY = 0.4;
