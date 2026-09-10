export {
  createDefaultBoard,
  defaultDimensionsFor,
  clampDimension,
  boardHypotenuse,
  boardPath,
  type Board,
  type BoardShape,
  type TriangleType,
  type BoardDimensions,
  type BoardAppearance,
} from "./board";
export type {
  EditorMode,
  EditorState,
  GridSettings,
  SnapSettings,
  PinTool,
  PinDefaults,
  Selection,
  ThreadTool,
  ThreadDefaults,
  ThreadDraft,
} from "./EditorState";
export { EditorStore } from "./EditorStore";
export {
  geometryToPath,
  createPinPath,
  recomputePinPath,
  distributePins,
  type PinPathGeometry,
  type Pin,
  type PinPath,
  type PinStyle,
} from "./pinPath";
export {
  createPinLayer,
  isLayerLocked,
  findPinPath,
  addPinPathToLayers,
  removePinPathFromLayers,
  updatePinPathInLayers,
  erasePinFromLayers,
  findPinById,
  duplicatePinLayer,
  type PinLayer,
} from "./pinLayer";
export { geometryFromDrag, curvatureFromCursor, DRAG_TOOLS } from "./pinToolGeometry";
export { NO_SYMMETRY, computeMirroredPinGroups, type SymmetryConfig } from "./symmetryConfig";
export { createThreadPath, removePinFromThreadPath, type ThreadPath } from "./threadPath";
export {
  createThreadLayer,
  isThreadLayerLocked,
  findThreadPath,
  addThreadPathToLayers,
  removeThreadPathFromLayers,
  removePinFromAllThreadLayers,
  duplicateThreadLayer,
  type ThreadLayer,
} from "./threadLayer";
export { renameLayer, toggleLayerVisible, toggleLayerLocked, deleteLayer, reorderLayer } from "./layerOps";
export {
  defaultPrintSettings,
  paperDimensionsCm,
  computeEffectiveScale,
  computeCorrectionFactor,
  computeTileGrid,
  type PrintSettings,
  type PrintElements,
  type PrintScale,
  type PrintScaleMode,
  type PaperConfig,
  type PaperSize,
  type PaperOrientation,
  type CalibrationSettings,
  type TilingSettings,
  type Tile,
} from "./printSettings";
export {
  pinPathStatistics,
  projectTotalPins,
  threadPathStatistics,
  type PinPathStatistics,
  type ThreadPathStatistics,
} from "./statistics";
export {
  CURRENT_PROJECT_VERSION,
  serializeProject,
  migrateProjectFile,
  createEmptyProject,
  projectFileToDocument,
  IncompatibleProjectVersionError,
  type ProjectFile,
  type SerializableDocument,
} from "./projectFile";
