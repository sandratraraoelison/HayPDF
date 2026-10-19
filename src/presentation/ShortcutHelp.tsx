import { Button } from "./ui/Button";
import { useEffect, useRef } from "react";
import { shortcutHelp } from "../application/shortcuts";
export function ShortcutHelp({
  onClose,
  t,
}: {
  onClose: () => void;
  t: (text: string) => string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <dialog
      ref={ref}
      className="shortcut-help"
      onClose={onClose}
      aria-labelledby="shortcut-title"
    >
      <div className="shortcut-header">
        <h2 id="shortcut-title">{t("Raccourcis clavier")}</h2>
        <Button
          variant="secondary"
          autoFocus
          onClick={() => ref.current?.close()}
        >
          {t("Fermer")}
        </Button>
      </div>
      <p>
        {t(
          "Dans les champs, les raccourcis de saisie habituels restent actifs.",
        )}
      </p>
      <table>
        <tbody>
          {shortcutHelp.map(([keys, label]) => (
            <tr key={label}>
              <td>{t(label)}</td>
              <td>
                <kbd>{t(keys).replaceAll("Ctrl", mac ? "⌘" : "Ctrl")}</kbd>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </dialog>
  );
}
