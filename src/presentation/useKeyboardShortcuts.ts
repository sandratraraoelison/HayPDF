import { useEffect } from "react";
import { resolveShortcut, type ShortcutAction } from "../application/shortcuts";
export function useKeyboardShortcuts(
  onAction: (action: ShortcutAction, shift: boolean) => void,
  onWheelZoom: (direction: number) => void,
) {
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const editing = !!target?.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
      );
      if (event.defaultPrevented || target?.closest("dialog[open]")) return;
      const action = resolveShortcut(event, editing);
      if (!action) return;
      event.preventDefault();
      if (
        event.repeat &&
        ["open", "save", "help", "deleteSelection"].includes(action)
      )
        return;
      onAction(action, event.shiftKey);
    };
    const wheel = (event: WheelEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        !event.deltaY ||
        !(event.target instanceof Element) ||
        !event.target.closest("main")
      )
        return;
      event.preventDefault();
      onWheelZoom(event.deltaY < 0 ? 1 : -1);
    };
    window.addEventListener("keydown", keydown, { capture: true });
    window.addEventListener("wheel", wheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", keydown, { capture: true });
      window.removeEventListener("wheel", wheel);
    };
  }, [onAction, onWheelZoom]);
}
