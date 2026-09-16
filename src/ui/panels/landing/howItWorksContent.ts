export interface LandingStep {
  titleKey: string;
  descriptionKey: string;
}

export const LANDING_STEPS: LandingStep[] = [
  { titleKey: "howItWorks.steps.setup.title", descriptionKey: "howItWorks.steps.setup.description" },
  { titleKey: "howItWorks.steps.pins.title", descriptionKey: "howItWorks.steps.pins.description" },
  { titleKey: "howItWorks.steps.threads.title", descriptionKey: "howItWorks.steps.threads.description" },
  { titleKey: "howItWorks.steps.print.title", descriptionKey: "howItWorks.steps.print.description" },
];
