import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import CookieConsent, { getCookieConsentValue } from "react-cookie-consent";
import { denyAnalyticsConsent, grantAnalyticsConsent } from "@infrastructure/analytics/consent";

const COOKIE_NAME = "stringartit:cookieConsent:v1";

export function CookieConsentBanner() {
  const { t } = useTranslation("cookieConsent");

  // Consent Mode state resets to index.html's "denied" default on every page
  // load — re-apply a previously recorded decision immediately on mount.
  useEffect(() => {
    const stored = getCookieConsentValue(COOKIE_NAME);
    if (stored === "true") grantAnalyticsConsent();
    else if (stored === "false") denyAnalyticsConsent();
  }, []);

  return (
    <CookieConsent
      cookieName={COOKIE_NAME}
      location="bottom"
      expires={365}
      enableDeclineButton
      flipButtons
      onAccept={grantAnalyticsConsent}
      onDecline={denyAnalyticsConsent}
      disableStyles
      containerClasses="cookie-consent-banner"
      contentClasses="cookie-consent-banner__text"
      buttonWrapperClasses="cookie-consent-banner__actions"
      buttonText={t("accept")}
      declineButtonText={t("decline")}
      buttonClasses="btn cookie-consent-banner__accept"
      declineButtonClasses="btn"
    >
      {t("message")}
    </CookieConsent>
  );
}
