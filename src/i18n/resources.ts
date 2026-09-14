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
} as const;

export const NAMESPACES = Object.keys(resources.en);
