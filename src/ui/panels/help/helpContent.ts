import type { ComponentType } from "react";
import { Hand, Info, Keyboard, Layers as LayersIcon, MousePointer2, Pin as PinIcon, Play, Spline } from "lucide-react";
import type { EditorMode } from "@application/document";
import { AboutTabContent } from "./AboutTabContent/AboutTabContent";

export type HelpTabId = "edit" | "pin" | "thread" | "pan" | "play" | "layers" | "keyboard-mouse" | "about";

export interface HelpItem {
  labelKey: string;
  descriptionKey: string;
}

export interface HelpSection {
  headingKey?: string;
  items: HelpItem[];
}

export interface HelpTab {
  id: HelpTabId;
  labelKey: string;
  icon: ComponentType<{ size?: number }>;
  // Static reference tabs use `sections` (rendered generically by HelpSectionView).
  // About instead renders a live, stateful contact form, so it supplies `Content` —
  // a custom component bypassing the generic section renderer entirely.
  sections?: HelpSection[];
  Content?: ComponentType;
}

// docs/specs/20-help.md — maps the live EditorMode to the Help tab shown by default
// when the modal opens, so Help always opens "on the thing you're doing." Layers and
// Keyboard & Mouse have no corresponding EditorMode, so they're simply never a target.
// docs/specs/32-generator-mode.md added a 6th Editor mode with no matching Help tab of
// its own yet (out of scope for that milestone — see its Scope section) — mapped to
// "edit" for now, same as the pre-existing HELP_TABS[0].id fallback this Record exists
// to make explicit, so opening Help from Generator mode still lands somewhere sensible
// rather than needing a runtime `??` to paper over a missing key.
export const MODE_TO_HELP_TAB: Record<EditorMode, HelpTabId> = {
  select: "edit",
  pin: "pin",
  thread: "thread",
  pan: "pan",
  play: "play",
  generate: "edit",
};

// Labels below reuse docs/conventions/ui-patterns.md's data-driven-content pattern,
// just with translation keys instead of literal text (docs/specs/24-internationalization.md):
// the five tab labels shared with ModeSwitcher.tsx resolve from the "common" namespace
// (common:modes.*) so the same word is never translated twice in two places; everything
// else resolves from the "help" namespace via HelpPanel.tsx's t().
export const HELP_TABS: HelpTab[] = [
  {
    id: "edit",
    labelKey: "common:modes.select",
    icon: MousePointer2,
    sections: [
      {
        headingKey: "edit.tools.heading",
        items: [
          { labelKey: "edit.tools.select.label", descriptionKey: "edit.tools.select.description" },
          { labelKey: "edit.tools.move.label", descriptionKey: "edit.tools.move.description" },
          { labelKey: "edit.tools.rotation.label", descriptionKey: "edit.tools.rotation.description" },
          { labelKey: "edit.tools.scale.label", descriptionKey: "edit.tools.scale.description" },
          { labelKey: "edit.tools.merge.label", descriptionKey: "edit.tools.merge.description" },
        ],
      },
      {
        headingKey: "edit.selectionPanel.heading",
        items: [
          { labelKey: "edit.selectionPanel.pinDistance.label", descriptionKey: "edit.selectionPanel.pinDistance.description" },
          { labelKey: "edit.selectionPanel.geometryFields.label", descriptionKey: "edit.selectionPanel.geometryFields.description" },
          { labelKey: "edit.selectionPanel.symmetry.label", descriptionKey: "edit.selectionPanel.symmetry.description" },
          { labelKey: "edit.selectionPanel.deletePinPath.label", descriptionKey: "edit.selectionPanel.deletePinPath.description" },
        ],
      },
    ],
  },
  {
    id: "pin",
    labelKey: "common:modes.pin",
    icon: PinIcon,
    sections: [
      {
        headingKey: "pin.drawingTools.heading",
        items: [
          { labelKey: "pin.drawingTools.line.label", descriptionKey: "pin.drawingTools.line.description" },
          { labelKey: "pin.drawingTools.arc.label", descriptionKey: "pin.drawingTools.arc.description" },
          { labelKey: "pin.drawingTools.ellipse.label", descriptionKey: "pin.drawingTools.ellipse.description" },
          { labelKey: "pin.drawingTools.circle.label", descriptionKey: "pin.drawingTools.circle.description" },
          { labelKey: "pin.drawingTools.rect.label", descriptionKey: "pin.drawingTools.rect.description" },
          { labelKey: "pin.drawingTools.square.label", descriptionKey: "pin.drawingTools.square.description" },
          { labelKey: "pin.drawingTools.freehand.label", descriptionKey: "pin.drawingTools.freehand.description" },
          { labelKey: "pin.drawingTools.path.label", descriptionKey: "pin.drawingTools.path.description" },
          { labelKey: "pin.drawingTools.eraser.label", descriptionKey: "pin.drawingTools.eraser.description" },
          { labelKey: "pin.drawingTools.pathEraser.label", descriptionKey: "pin.drawingTools.pathEraser.description" },
          { labelKey: "pin.drawingTools.polygonStar.label", descriptionKey: "pin.drawingTools.polygonStar.description" },
        ],
      },
      {
        headingKey: "pin.pinProperties.heading",
        items: [
          { labelKey: "pin.pinProperties.spacing.label", descriptionKey: "pin.pinProperties.spacing.description" },
          { labelKey: "pin.pinProperties.actualGap.label", descriptionKey: "pin.pinProperties.actualGap.description" },
          { labelKey: "pin.pinProperties.diameter.label", descriptionKey: "pin.pinProperties.diameter.description" },
          { labelKey: "pin.pinProperties.colour.label", descriptionKey: "pin.pinProperties.colour.description" },
          { labelKey: "pin.pinProperties.guideVisible.label", descriptionKey: "pin.pinProperties.guideVisible.description" },
        ],
      },
      {
        headingKey: "pin.symmetry.heading",
        items: [
          { labelKey: "pin.symmetry.modes.label", descriptionKey: "pin.symmetry.modes.description" },
          { labelKey: "pin.symmetry.interval.label", descriptionKey: "pin.symmetry.interval.description" },
          { labelKey: "pin.symmetry.centre.label", descriptionKey: "pin.symmetry.centre.description" },
        ],
      },
    ],
  },
  {
    id: "thread",
    labelKey: "common:modes.thread",
    icon: Spline,
    sections: [
      {
        headingKey: "thread.tools.heading",
        items: [
          { labelKey: "thread.tools.draw.label", descriptionKey: "thread.tools.draw.description" },
          { labelKey: "thread.tools.zigzag.label", descriptionKey: "thread.tools.zigzag.description" },
          { labelKey: "thread.tools.parabolic.label", descriptionKey: "thread.tools.parabolic.description" },
          { labelKey: "thread.tools.eraser.label", descriptionKey: "thread.tools.eraser.description" },
          { labelKey: "thread.tools.segment.label", descriptionKey: "thread.tools.segment.description" },
        ],
      },
      {
        headingKey: "thread.properties.heading",
        items: [
          { labelKey: "thread.properties.colourCount.label", descriptionKey: "thread.properties.colourCount.description" },
          { labelKey: "thread.properties.swatches.label", descriptionKey: "thread.properties.swatches.description" },
          { labelKey: "thread.properties.width.label", descriptionKey: "thread.properties.width.description" },
          { labelKey: "thread.properties.twistPitch.label", descriptionKey: "thread.properties.twistPitch.description" },
          { labelKey: "thread.properties.pinStateLegend.label", descriptionKey: "thread.properties.pinStateLegend.description" },
        ],
      },
    ],
  },
  {
    id: "pan",
    labelKey: "common:modes.pan",
    icon: Hand,
    sections: [
      {
        headingKey: "pan.canvas.heading",
        items: [{ labelKey: "pan.canvas.leftClickDrag.label", descriptionKey: "pan.canvas.leftClickDrag.description" }],
      },
      {
        headingKey: "pan.grid.heading",
        items: [
          { labelKey: "pan.grid.gridToggle.label", descriptionKey: "pan.grid.gridToggle.description" },
          { labelKey: "pan.grid.snapToggle.label", descriptionKey: "pan.grid.snapToggle.description" },
          { labelKey: "pan.grid.gapXY.label", descriptionKey: "pan.grid.gapXY.description" },
          { labelKey: "pan.grid.gridColour.label", descriptionKey: "pan.grid.gridColour.description" },
          { labelKey: "pan.grid.gridOpacity.label", descriptionKey: "pan.grid.gridOpacity.description" },
        ],
      },
      {
        headingKey: "pan.zoom.heading",
        items: [
          { labelKey: "pan.zoom.zoomInOut.label", descriptionKey: "pan.zoom.zoomInOut.description" },
          { labelKey: "pan.zoom.fit.label", descriptionKey: "pan.zoom.fit.description" },
        ],
      },
    ],
  },
  {
    id: "play",
    labelKey: "common:modes.play",
    icon: Play,
    sections: [
      {
        headingKey: "play.transport.heading",
        items: [
          { labelKey: "play.transport.firstPrevNextLast.label", descriptionKey: "play.transport.firstPrevNextLast.description" },
          { labelKey: "play.transport.playPause.label", descriptionKey: "play.transport.playPause.description" },
          { labelKey: "play.transport.frame.label", descriptionKey: "play.transport.frame.description" },
          { labelKey: "play.transport.total.label", descriptionKey: "play.transport.total.description" },
          { labelKey: "play.transport.interval.label", descriptionKey: "play.transport.interval.description" },
        ],
      },
      {
        headingKey: "play.export.heading",
        items: [{ labelKey: "play.export.exportToVideo.label", descriptionKey: "play.export.exportToVideo.description" }],
      },
    ],
  },
  {
    id: "layers",
    labelKey: "help:tabs.layers",
    icon: LayersIcon,
    sections: [
      {
        headingKey: "layers.tabSwitchSection.heading",
        items: [{ labelKey: "layers.tabSwitchSection.tabSwitch.label", descriptionKey: "layers.tabSwitchSection.tabSwitch.description" }],
      },
      {
        headingKey: "layers.row.heading",
        items: [
          { labelKey: "layers.row.eyeIcon.label", descriptionKey: "layers.row.eyeIcon.description" },
          { labelKey: "layers.row.lockIcon.label", descriptionKey: "layers.row.lockIcon.description" },
          { labelKey: "layers.row.nameRename.label", descriptionKey: "layers.row.nameRename.description" },
          { labelKey: "layers.row.clickRow.label", descriptionKey: "layers.row.clickRow.description" },
        ],
      },
      {
        headingKey: "layers.actions.heading",
        items: [
          { labelKey: "layers.actions.newLayer.label", descriptionKey: "layers.actions.newLayer.description" },
          { labelKey: "layers.actions.duplicate.label", descriptionKey: "layers.actions.duplicate.description" },
          { labelKey: "layers.actions.merge.label", descriptionKey: "layers.actions.merge.description" },
          { labelKey: "layers.actions.moveLayer.label", descriptionKey: "layers.actions.moveLayer.description" },
          { labelKey: "layers.actions.delete.label", descriptionKey: "layers.actions.delete.description" },
        ],
      },
    ],
  },
  {
    id: "keyboard-mouse",
    labelKey: "help:tabs.keyboardMouse",
    icon: Keyboard,
    sections: [
      {
        headingKey: "keyboardMouse.keyboard.heading",
        items: [
          { labelKey: "keyboardMouse.keyboard.undo.label", descriptionKey: "keyboardMouse.keyboard.undo.description" },
          { labelKey: "keyboardMouse.keyboard.redo.label", descriptionKey: "keyboardMouse.keyboard.redo.description" },
          { labelKey: "keyboardMouse.keyboard.escape.label", descriptionKey: "keyboardMouse.keyboard.escape.description" },
          { labelKey: "keyboardMouse.keyboard.arrowLeft.label", descriptionKey: "keyboardMouse.keyboard.arrowLeft.description" },
          { labelKey: "keyboardMouse.keyboard.arrowRight.label", descriptionKey: "keyboardMouse.keyboard.arrowRight.description" },
          { labelKey: "keyboardMouse.keyboard.arrowUpDown.label", descriptionKey: "keyboardMouse.keyboard.arrowUpDown.description" },
          { labelKey: "keyboardMouse.keyboard.shift.label", descriptionKey: "keyboardMouse.keyboard.shift.description" },
          { labelKey: "keyboardMouse.keyboard.holdArrow.label", descriptionKey: "keyboardMouse.keyboard.holdArrow.description" },
          { labelKey: "keyboardMouse.keyboard.alt.label", descriptionKey: "keyboardMouse.keyboard.alt.description" },
        ],
      },
      {
        headingKey: "keyboardMouse.mouse.heading",
        items: [
          { labelKey: "keyboardMouse.mouse.leftButton.label", descriptionKey: "keyboardMouse.mouse.leftButton.description" },
          { labelKey: "keyboardMouse.mouse.rightClick.label", descriptionKey: "keyboardMouse.mouse.rightClick.description" },
          { labelKey: "keyboardMouse.mouse.doubleClick.label", descriptionKey: "keyboardMouse.mouse.doubleClick.description" },
          { labelKey: "keyboardMouse.mouse.leftDrag.label", descriptionKey: "keyboardMouse.mouse.leftDrag.description" },
          { labelKey: "keyboardMouse.mouse.wheel.label", descriptionKey: "keyboardMouse.mouse.wheel.description" },
          { labelKey: "keyboardMouse.mouse.middleDrag.label", descriptionKey: "keyboardMouse.mouse.middleDrag.description" },
        ],
      },
      // docs/specs/34-keyboard-shortcuts.md — the full app-wide/per-tab shortcut
      // table, appended to this existing tab rather than a new one (only document
      // features that actually exist, per docs/conventions/ui-patterns.md).
      {
        headingKey: "keyboardMouse.shortcuts.general.heading",
        items: [
          { labelKey: "keyboardMouse.shortcuts.general.save.label", descriptionKey: "keyboardMouse.shortcuts.general.save.description" },
          { labelKey: "keyboardMouse.shortcuts.general.open.label", descriptionKey: "keyboardMouse.shortcuts.general.open.description" },
          { labelKey: "keyboardMouse.shortcuts.general.new.label", descriptionKey: "keyboardMouse.shortcuts.general.new.description" },
          { labelKey: "keyboardMouse.shortcuts.general.help.label", descriptionKey: "keyboardMouse.shortcuts.general.help.description" },
          { labelKey: "keyboardMouse.shortcuts.general.zoomIn.label", descriptionKey: "keyboardMouse.shortcuts.general.zoomIn.description" },
          { labelKey: "keyboardMouse.shortcuts.general.zoomOut.label", descriptionKey: "keyboardMouse.shortcuts.general.zoomOut.description" },
          { labelKey: "keyboardMouse.shortcuts.general.fit.label", descriptionKey: "keyboardMouse.shortcuts.general.fit.description" },
          { labelKey: "keyboardMouse.shortcuts.general.grid.label", descriptionKey: "keyboardMouse.shortcuts.general.grid.description" },
          { labelKey: "keyboardMouse.shortcuts.general.snap.label", descriptionKey: "keyboardMouse.shortcuts.general.snap.description" },
          { labelKey: "keyboardMouse.shortcuts.general.delete.label", descriptionKey: "keyboardMouse.shortcuts.general.delete.description" },
        ],
      },
      {
        headingKey: "keyboardMouse.shortcuts.tabs.heading",
        items: [{ labelKey: "keyboardMouse.shortcuts.tabs.tabSwitch.label", descriptionKey: "keyboardMouse.shortcuts.tabs.tabSwitch.description" }],
      },
      {
        headingKey: "keyboardMouse.shortcuts.edit.heading",
        items: [
          { labelKey: "keyboardMouse.shortcuts.edit.granularity.label", descriptionKey: "keyboardMouse.shortcuts.edit.granularity.description" },
          { labelKey: "keyboardMouse.shortcuts.edit.select.label", descriptionKey: "keyboardMouse.shortcuts.edit.select.description" },
          { labelKey: "keyboardMouse.shortcuts.edit.move.label", descriptionKey: "keyboardMouse.shortcuts.edit.move.description" },
          { labelKey: "keyboardMouse.shortcuts.edit.rotate.label", descriptionKey: "keyboardMouse.shortcuts.edit.rotate.description" },
          { labelKey: "keyboardMouse.shortcuts.edit.scale.label", descriptionKey: "keyboardMouse.shortcuts.edit.scale.description" },
          { labelKey: "keyboardMouse.shortcuts.edit.merge.label", descriptionKey: "keyboardMouse.shortcuts.edit.merge.description" },
        ],
      },
      {
        headingKey: "keyboardMouse.shortcuts.pin.heading",
        items: [
          { labelKey: "keyboardMouse.shortcuts.pin.line.label", descriptionKey: "keyboardMouse.shortcuts.pin.line.description" },
          { labelKey: "keyboardMouse.shortcuts.pin.arc.label", descriptionKey: "keyboardMouse.shortcuts.pin.arc.description" },
          { labelKey: "keyboardMouse.shortcuts.pin.ellipse.label", descriptionKey: "keyboardMouse.shortcuts.pin.ellipse.description" },
          { labelKey: "keyboardMouse.shortcuts.pin.circle.label", descriptionKey: "keyboardMouse.shortcuts.pin.circle.description" },
          { labelKey: "keyboardMouse.shortcuts.pin.rectangle.label", descriptionKey: "keyboardMouse.shortcuts.pin.rectangle.description" },
          { labelKey: "keyboardMouse.shortcuts.pin.square.label", descriptionKey: "keyboardMouse.shortcuts.pin.square.description" },
          { labelKey: "keyboardMouse.shortcuts.pin.freehand.label", descriptionKey: "keyboardMouse.shortcuts.pin.freehand.description" },
          { labelKey: "keyboardMouse.shortcuts.pin.path.label", descriptionKey: "keyboardMouse.shortcuts.pin.path.description" },
          { labelKey: "keyboardMouse.shortcuts.pin.text.label", descriptionKey: "keyboardMouse.shortcuts.pin.text.description" },
          { labelKey: "keyboardMouse.shortcuts.pin.eraser.label", descriptionKey: "keyboardMouse.shortcuts.pin.eraser.description" },
          { labelKey: "keyboardMouse.shortcuts.pin.pathEraser.label", descriptionKey: "keyboardMouse.shortcuts.pin.pathEraser.description" },
          { labelKey: "keyboardMouse.shortcuts.pin.symmetryCycle.label", descriptionKey: "keyboardMouse.shortcuts.pin.symmetryCycle.description" },
        ],
      },
      {
        headingKey: "keyboardMouse.shortcuts.thread.heading",
        items: [
          { labelKey: "keyboardMouse.shortcuts.thread.draw.label", descriptionKey: "keyboardMouse.shortcuts.thread.draw.description" },
          { labelKey: "keyboardMouse.shortcuts.thread.zigzag.label", descriptionKey: "keyboardMouse.shortcuts.thread.zigzag.description" },
          { labelKey: "keyboardMouse.shortcuts.thread.parabolic.label", descriptionKey: "keyboardMouse.shortcuts.thread.parabolic.description" },
          { labelKey: "keyboardMouse.shortcuts.thread.select.label", descriptionKey: "keyboardMouse.shortcuts.thread.select.description" },
          { labelKey: "keyboardMouse.shortcuts.thread.eraser.label", descriptionKey: "keyboardMouse.shortcuts.thread.eraser.description" },
          { labelKey: "keyboardMouse.shortcuts.thread.segmentEraser.label", descriptionKey: "keyboardMouse.shortcuts.thread.segmentEraser.description" },
          { labelKey: "keyboardMouse.shortcuts.thread.colourCount.label", descriptionKey: "keyboardMouse.shortcuts.thread.colourCount.description" },
          { labelKey: "keyboardMouse.shortcuts.thread.width.label", descriptionKey: "keyboardMouse.shortcuts.thread.width.description" },
        ],
      },
      {
        headingKey: "keyboardMouse.shortcuts.play.heading",
        items: [
          { labelKey: "keyboardMouse.shortcuts.play.first.label", descriptionKey: "keyboardMouse.shortcuts.play.first.description" },
          { labelKey: "keyboardMouse.shortcuts.play.previous.label", descriptionKey: "keyboardMouse.shortcuts.play.previous.description" },
          { labelKey: "keyboardMouse.shortcuts.play.playPause.label", descriptionKey: "keyboardMouse.shortcuts.play.playPause.description" },
          { labelKey: "keyboardMouse.shortcuts.play.next.label", descriptionKey: "keyboardMouse.shortcuts.play.next.description" },
          { labelKey: "keyboardMouse.shortcuts.play.last.label", descriptionKey: "keyboardMouse.shortcuts.play.last.description" },
          { labelKey: "keyboardMouse.shortcuts.play.export.label", descriptionKey: "keyboardMouse.shortcuts.play.export.description" },
        ],
      },
    ],
  },
  {
    id: "about",
    labelKey: "help:tabs.about",
    icon: Info,
    Content: AboutTabContent,
  },
];
