export type ShortcutAction =
  | "open"
  | "save"
  | "undo"
  | "redo"
  | "zoomIn"
  | "zoomOut"
  | "actualSize"
  | "fitWidth"
  | "fitPage"
  | "previousPage"
  | "nextPage"
  | "firstPage"
  | "lastPage"
  | "deleteSelection"
  | "escape"
  | "selectTool"
  | "textTool"
  | "highlightTool"
  | "rectangleTool"
  | "moveLeft"
  | "moveRight"
  | "moveUp"
  | "moveDown"
  | "help";
export interface KeyInput {
  key: string;
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing?: boolean;
}
/** Resolve intent independently of React. Native editing shortcuts keep working in inputs. */
export function resolveShortcut(
  event: KeyInput,
  editing: boolean,
): ShortcutAction | undefined {
  if (event.isComposing || event.altKey) return;
  const key = event.key.toLowerCase();
  const command = event.ctrlKey || event.metaKey;
  if (key === "escape") return "escape";
  if (key === "f1" || (!editing && key === "?")) return "help";
  if (command) {
    if (key === "o" && !event.shiftKey) return "open";
    if (key === "s" && !event.shiftKey) return "save";
    if (key === "+" || key === "=" || event.code === "NumpadAdd")
      return "zoomIn";
    if (key === "-" || event.code === "NumpadSubtract") return "zoomOut";
    if (key === "0" || event.code === "Digit0" || event.code === "Numpad0")
      return "actualSize";
    if (key === "1" || event.code === "Digit1" || event.code === "Numpad1")
      return "fitWidth";
    if (key === "2" || event.code === "Digit2" || event.code === "Numpad2")
      return "fitPage";
    if (editing) return;
    if (key === "z") return event.shiftKey ? "redo" : "undo";
    if (key === "y" && !event.shiftKey) return "redo";
    if (key === "home") return "firstPage";
    if (key === "end") return "lastPage";
    return;
  }
  if (editing) return;
  return (
    {
      pageup: "previousPage",
      pagedown: "nextPage",
      home: "firstPage",
      end: "lastPage",
      delete: "deleteSelection",
      backspace: "deleteSelection",
      v: "selectTool",
      t: "textTool",
      h: "highlightTool",
      r: "rectangleTool",
      arrowleft: "moveLeft",
      arrowright: "moveRight",
      arrowup: "moveUp",
      arrowdown: "moveDown",
    } as Record<string, ShortcutAction>
  )[key];
}
export const clampZoom = (value: number) =>
  Math.max(0.25, Math.min(3, Math.round(value * 100) / 100));
export const shortcutHelp: ReadonlyArray<readonly [string, string]> = [
  ["Ctrl + O", "Ouvrir un PDF"],
  ["Ctrl + S", "Exporter le PDF"],
  ["Ctrl + Z", "Annuler"],
  ["Ctrl + Y / Ctrl + Maj + Z", "Rétablir"],
  ["Ctrl + + / Ctrl + −", "Zoom avant / arrière"],
  ["Ctrl + molette", "Zoom à la molette"],
  ["Ctrl + 0", "Taille réelle (100 %)"],
  ["Ctrl + 1", "Ajuster à la largeur"],
  ["Ctrl + 2", "Ajuster à la page"],
  ["Page ↑ / Page ↓", "Page précédente / suivante"],
  ["Début / Fin", "Première / dernière page"],
  ["Suppr / Retour arrière", "Supprimer l’élément sélectionné"],
  ["← ↑ → ↓", "Déplacer l’élément (1 pt)"],
  ["Maj + ← ↑ → ↓", "Déplacer l’élément (10 pt)"],
  ["V / T / H / R", "Sélection / Texte / Surligner / Forme"],
  ["Échap", "Quitter l’outil / désélectionner"],
  ["F1 / ?", "Raccourcis clavier"],
];
