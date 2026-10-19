import { useEffect, useRef } from "react";

export function useAboutDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return { dialog, close: () => dialog.current?.close() };
}
