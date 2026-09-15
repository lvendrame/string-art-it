// Bridges the cookie-consent banner's decision to Google Consent Mode v2.
// index.html sets analytics_storage to "denied" by default (before gtag config
// fires) so no GA cookie is written until the user explicitly accepts here.
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type ConsentState = "granted" | "denied";

function updateAnalyticsConsent(state: ConsentState): void {
  try {
    window.gtag?.("consent", "update", { analytics_storage: state });
  } catch {
    // best-effort, same posture as languagePreference.ts — a consent update
    // must never throw and break the banner interaction.
  }
}

export function grantAnalyticsConsent(): void {
  updateAnalyticsConsent("granted");
}

export function denyAnalyticsConsent(): void {
  updateAnalyticsConsent("denied");
}
