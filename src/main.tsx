import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import i18n, { ensureLanguageLoaded, preloadAllLanguages } from "./i18n";
import { isSupportedLanguage } from "./i18n/languages";
import "./ui/theme.css";

function render() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

function whenIdle(callback: () => void) {
  if ("requestIdleCallback" in window) window.requestIdleCallback(callback);
  else setTimeout(callback, 2000);
}

async function bootstrap() {
  const lng = i18n.language;
  if (isSupportedLanguage(lng)) await ensureLanguageLoaded(lng).catch(() => {});
  render();
  whenIdle(() => void preloadAllLanguages());
}

void bootstrap();
