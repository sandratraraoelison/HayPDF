import { useEffect, useRef, useState } from "react";
import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";
export function UnlockPdfDialog() {
  const { lockedFile, unlockDocument, cancelUnlock, busy, operationError, t } =
    useEditor();
  const ref = useRef<HTMLDialogElement>(null),
    [password, setPassword] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="advanced-dialog"
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      onClose={cancelUnlock}
      aria-labelledby="unlock-title"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void unlockDocument(password);
        }}
      >
        <h2 id="unlock-title">{t("PDF protégé")}</h2>
        <p>{lockedFile?.name}</p>
        <p>
          {t(
            "Pour exporter une copie avec mot de passe, utilisez Protéger un PDF après modification.",
          )}
        </p>
        <label>
          {t("Mot de passe d’ouverture")}
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            disabled={busy}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {operationError && (
          <p className="advanced-error" role="alert">
            {operationError.summary}
          </p>
        )}
        <div className="advanced-actions">
          <Button disabled={busy} onClick={() => ref.current?.close()}>
            {t("Fermer")}
          </Button>
          <Button disabled={busy} variant="primary" type="submit">
            {t("Ouvrir le document")}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
