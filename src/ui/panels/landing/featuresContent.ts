import type { ComponentType } from "react";
import { Layers as LayersIcon, Pin as PinIcon, Printer, Shapes, Spline, Undo2 } from "lucide-react";

export interface LandingFeature {
  icon: ComponentType<{ size?: number }>;
  titleKey: string;
  descriptionKey: string;
}

export const LANDING_FEATURES: LandingFeature[] = [
  { icon: Shapes, titleKey: "features.items.shapes.title", descriptionKey: "features.items.shapes.description" },
  { icon: PinIcon, titleKey: "features.items.pins.title", descriptionKey: "features.items.pins.description" },
  { icon: Spline, titleKey: "features.items.threads.title", descriptionKey: "features.items.threads.description" },
  { icon: LayersIcon, titleKey: "features.items.layers.title", descriptionKey: "features.items.layers.description" },
  { icon: Undo2, titleKey: "features.items.undo.title", descriptionKey: "features.items.undo.description" },
  { icon: Printer, titleKey: "features.items.print.title", descriptionKey: "features.items.print.description" },
];
