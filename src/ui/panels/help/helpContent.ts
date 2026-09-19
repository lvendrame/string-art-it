import type { ComponentType } from "react";
import { Hand, Info, Keyboard, Layers as LayersIcon, MousePointer2, Pin as PinIcon, Play, Spline } from "lucide-react";
import type { EditorMode } from "../../../application/document";
import { AboutTabContent } from "./AboutTabContent";

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
