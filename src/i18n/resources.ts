import commonEn from "./locales/en/common.json";
import boardSetupEn from "./locales/en/boardSetup.json";
import editorShellEn from "./locales/en/editorShell.json";
import menusEn from "./locales/en/menus.json";
import toolbarsEn from "./locales/en/toolbars.json";
import panelsEn from "./locales/en/panels.json";
import printPreviewEn from "./locales/en/printPreview.json";
import canvasEn from "./locales/en/canvas.json";
import helpEn from "./locales/en/help.json";
import errorsEn from "./locales/en/errors.json";

import commonPtBR from "./locales/pt-BR/common.json";
import boardSetupPtBR from "./locales/pt-BR/boardSetup.json";
import editorShellPtBR from "./locales/pt-BR/editorShell.json";
import menusPtBR from "./locales/pt-BR/menus.json";
import toolbarsPtBR from "./locales/pt-BR/toolbars.json";
import panelsPtBR from "./locales/pt-BR/panels.json";
import printPreviewPtBR from "./locales/pt-BR/printPreview.json";
import canvasPtBR from "./locales/pt-BR/canvas.json";
import helpPtBR from "./locales/pt-BR/help.json";
import errorsPtBR from "./locales/pt-BR/errors.json";

import commonEs from "./locales/es/common.json";
import boardSetupEs from "./locales/es/boardSetup.json";
import editorShellEs from "./locales/es/editorShell.json";
import menusEs from "./locales/es/menus.json";
import toolbarsEs from "./locales/es/toolbars.json";
import panelsEs from "./locales/es/panels.json";
import printPreviewEs from "./locales/es/printPreview.json";
import canvasEs from "./locales/es/canvas.json";
import helpEs from "./locales/es/help.json";
import errorsEs from "./locales/es/errors.json";

import commonFr from "./locales/fr/common.json";
import boardSetupFr from "./locales/fr/boardSetup.json";
import editorShellFr from "./locales/fr/editorShell.json";
import menusFr from "./locales/fr/menus.json";
import toolbarsFr from "./locales/fr/toolbars.json";
import panelsFr from "./locales/fr/panels.json";
import printPreviewFr from "./locales/fr/printPreview.json";
import canvasFr from "./locales/fr/canvas.json";
import helpFr from "./locales/fr/help.json";
import errorsFr from "./locales/fr/errors.json";

import commonDe from "./locales/de/common.json";
import boardSetupDe from "./locales/de/boardSetup.json";
import editorShellDe from "./locales/de/editorShell.json";
import menusDe from "./locales/de/menus.json";
import toolbarsDe from "./locales/de/toolbars.json";
import panelsDe from "./locales/de/panels.json";
import printPreviewDe from "./locales/de/printPreview.json";
import canvasDe from "./locales/de/canvas.json";
import helpDe from "./locales/de/help.json";
import errorsDe from "./locales/de/errors.json";

export const resources = {
  en: {
    common: commonEn,
    boardSetup: boardSetupEn,
    editorShell: editorShellEn,
    menus: menusEn,
    toolbars: toolbarsEn,
    panels: panelsEn,
    printPreview: printPreviewEn,
    canvas: canvasEn,
    help: helpEn,
    errors: errorsEn,
  },
  "pt-BR": {
    common: commonPtBR,
    boardSetup: boardSetupPtBR,
    editorShell: editorShellPtBR,
    menus: menusPtBR,
    toolbars: toolbarsPtBR,
    panels: panelsPtBR,
    printPreview: printPreviewPtBR,
    canvas: canvasPtBR,
    help: helpPtBR,
    errors: errorsPtBR,
  },
  es: {
    common: commonEs,
    boardSetup: boardSetupEs,
    editorShell: editorShellEs,
    menus: menusEs,
    toolbars: toolbarsEs,
    panels: panelsEs,
    printPreview: printPreviewEs,
    canvas: canvasEs,
    help: helpEs,
    errors: errorsEs,
  },
  fr: {
    common: commonFr,
    boardSetup: boardSetupFr,
    editorShell: editorShellFr,
    menus: menusFr,
    toolbars: toolbarsFr,
    panels: panelsFr,
    printPreview: printPreviewFr,
    canvas: canvasFr,
    help: helpFr,
    errors: errorsFr,
  },
  de: {
    common: commonDe,
    boardSetup: boardSetupDe,
    editorShell: editorShellDe,
    menus: menusDe,
    toolbars: toolbarsDe,
    panels: panelsDe,
    printPreview: printPreviewDe,
    canvas: canvasDe,
    help: helpDe,
    errors: errorsDe,
  },
} as const;

export const NAMESPACES = Object.keys(resources.en);
