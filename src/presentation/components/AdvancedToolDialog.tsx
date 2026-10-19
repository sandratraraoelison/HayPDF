import { useEffect, useRef, useState } from "react";
import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";
import { NumberField } from "../ui/NumberField";
import type { AdvancedOptions } from "../../infrastructure/advancedPdf";
import { PdfAreaPreview } from "./PdfAreaPreview";
import { FormFieldOptions } from "./FormFieldOptions";

const labels = {
  blank: "Insérer une page vierge",
  header: "En-tête et pied de page",
  watermark: "Filigrane",
  link: "Lien",
  redact: "Biffer un PDF",
  form: "Préparer un formulaire",
};
export function AdvancedToolDialog() {
  const {
    advancedAction: action,
    setAdvancedAction,
    applyAdvanced,
    t,
    busy,
    operationError,
    doc,
    page,
  } = useEditor();
  const ref = useRef<HTMLDialogElement>(null);
  const [options, setOptions] = useState<AdvancedOptions>({
    text: "",
    footer: "{page} / {pages}",
    allPages: false,
    x: 40,
    y: 40,
    width: 200,
    height: 30,
  });
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  if (!action) return null;
  const zone = ["link", "redact", "form"].includes(action);
  return (
    <dialog
      ref={ref}
      className="advanced-dialog"
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      onClose={() => setAdvancedAction(undefined)}
      aria-labelledby="advanced-title"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void applyAdvanced(options);
        }}
      >
        <h2 id="advanced-title">{t(labels[action])}</h2>
        <fieldset disabled={busy}>
          {action === "form" && (
            <FormFieldOptions options={options} onChange={setOptions} t={t} />
          )}
          {action === "blank" && (
            <p>{t("La page vierge sera insérée après la page actuelle.")}</p>
          )}
          {action !== "blank" &&
            action !== "redact" &&
            (action !== "form" ||
              !options.formType ||
              options.formType === "text") && (
              <label>
                {t(action === "link" ? "Adresse du lien" : "Contenu")}
                <input
                  autoFocus
                  required={action !== "form"}
                  type={action === "link" ? "url" : "text"}
                  value={options.text}
                  placeholder={action === "link" ? "https://example.com" : ""}
                  onChange={(e) =>
                    setOptions({ ...options, text: e.target.value })
                  }
                />
              </label>
            )}
          {action === "header" && (
            <label>
              {t("Pied de page")}
              <input
                value={options.footer}
                onChange={(e) =>
                  setOptions({ ...options, footer: e.target.value })
                }
              />
            </label>
          )}
          {(action === "header" || action === "watermark") && (
            <>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={options.allPages}
                  onChange={(e) =>
                    setOptions({ ...options, allPages: e.target.checked })
                  }
                />
                {t("Toutes les pages")}
              </label>
              <p>{t("{page} : numéro de page · {pages} : nombre de pages")}</p>
            </>
          )}
          {zone && (
            <>
              <p>
                {t(
                  "Zone en points PDF, depuis le coin supérieur gauche de la page actuelle.",
                )}
              </p>
              <div className="advanced-coordinates">
                {(["x", "y", "width", "height"] as const).map((key) => (
                  <NumberField
                    key={key}
                    label={t(
                      { x: "X", y: "Y", width: "Largeur", height: "Hauteur" }[
                        key
                      ],
                    )}
                    value={options[key]}
                    min={key === "x" || key === "y" ? 0 : 1}
                    onChange={(value) =>
                      setOptions({ ...options, [key]: value })
                    }
                  />
                ))}
              </div>
            </>
          )}
          {action === "redact" && (
            <p className="redaction-explanation">
              {t(
                "Le texte, les pixels des images et les tracés touchés seront retirés de cette zone. Annulation disponible avant fermeture du document.",
              )}
            </p>
          )}
          {action === "form" && (
            <p>
              {t(
                "Ajoute un champ interactif. Utilisez Remplir un formulaire pour saisir les réponses dans l’éditeur.",
              )}
            </p>
          )}
          {zone && doc && page && (
            <>
              <p>{t("Cliquez sur l’aperçu pour positionner la zone.")}</p>
              <PdfAreaPreview
                doc={doc}
                page={page}
                area={options}
                onPosition={(x, y) =>
                  setOptions({ ...options, x: Math.round(x), y: Math.round(y) })
                }
                t={t}
              />
            </>
          )}
        </fieldset>
        {operationError && (
          <p role="alert" className="advanced-error">
            {operationError.summary}
          </p>
        )}
        <div className="advanced-actions">
          <Button disabled={busy} onClick={() => ref.current?.close()}>
            {t("Fermer")}
          </Button>
          <Button
            type="submit"
            variant={action === "redact" ? "danger" : "primary"}
            disabled={busy}
          >
            {busy ? t("Traitement…") : t("Appliquer")}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
