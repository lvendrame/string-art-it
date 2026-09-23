import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetCookieConsentValue } from "react-cookie-consent";
import { CookieConsentBanner } from "./CookieConsentBanner";

const COOKIE_NAME = "stringartit:cookieConsent:v1";

describe("CookieConsentBanner", () => {
  beforeEach(() => {
    window.gtag = vi.fn();
  });

  afterEach(() => {
    resetCookieConsentValue(COOKIE_NAME);
    delete window.gtag;
  });

  it("shows the banner with accept and decline actions when no decision is stored", () => {
    render(<CookieConsentBanner />);

    expect(screen.getByText(/we use cookies/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept cookies" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline cookies" })).toBeInTheDocument();
  });

  it("grants analytics consent and hides the banner on accept", () => {
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByRole("button", { name: "Accept cookies" }));

    expect(window.gtag).toHaveBeenCalledWith("consent", "update", { analytics_storage: "granted" });
    expect(screen.queryByText(/we use cookies/i)).not.toBeInTheDocument();
  });

  it("keeps analytics consent denied and hides the banner on decline", () => {
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByRole("button", { name: "Decline cookies" }));

    expect(window.gtag).toHaveBeenCalledWith("consent", "update", { analytics_storage: "denied" });
    expect(screen.queryByText(/we use cookies/i)).not.toBeInTheDocument();
  });

  it("re-applies a previously accepted decision found on mount", () => {
    document.cookie = `${COOKIE_NAME}=true`;
    render(<CookieConsentBanner />);

    expect(window.gtag).toHaveBeenCalledWith("consent", "update", { analytics_storage: "granted" });
  });

  it("re-applies a previously declined decision found on mount", () => {
    document.cookie = `${COOKIE_NAME}=false`;
    render(<CookieConsentBanner />);

    expect(window.gtag).toHaveBeenCalledWith("consent", "update", { analytics_storage: "denied" });
  });
});
