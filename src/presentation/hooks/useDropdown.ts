import { useEffect, useRef, useState } from "react";

export function useDropdown(disabled: boolean, width = 300) {
  const trigger = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number }>();
  const open = !!position && !disabled;
  function close() {
    setPosition(undefined);
  }
  function toggle() {
    if (open) {
      close();
      return;
    }
    const rect = trigger.current?.getBoundingClientRect();
    if (rect)
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 16)),
        top: rect.bottom + 8,
      });
  }
  useEffect(() => {
    if (!open) return;
    panel.current
      ?.querySelector<HTMLButtonElement>(
        'button[aria-pressed="true"], button:not(:disabled)',
      )
      ?.focus();
    const outside = (event: PointerEvent) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        close();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        trigger.current?.focus();
      }
    };
    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", key);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", key);
      window.removeEventListener("resize", close);
    };
  }, [open]);
  return { trigger, panel, open, position, toggle, close };
}
