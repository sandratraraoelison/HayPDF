import { useEffect, useRef, useState } from "react";
import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";
import { NumberField } from "../ui/NumberField";
import {
  documentToolLabels,
  type DocumentToolOptions,
} from "../../application/documentTools";
import { FormFieldInputs } from "./FormFieldInputs";
import { OperationErrorDetails } from "./OperationErrorDetails";

export function DocumentToolDialog() {
  const {
    documentTool: tool,
    closeDocumentTool,
    executeDocumentTool,
    t,
    busy,
    operationError,
    formFields,
  } = useEditor();
  const ref = useRef<HTMLDialogElement>(null);
  const [options, setOptions] = useState<DocumentToolOptions>({
    format: "png",
    ranges: "",
    dpi: 144,
    password: "",
    confirmPassword: "",
    createMode: "blank",
    width: 595,
    height: 842,
    files: [],
    values: Object.fromEntries(
      formFields.map((field) => [field.name, field.value]),
    ),
    formAction: "fill",
  });
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  if (!tool) return null;
  return (
    <dialog
      ref={ref}
      className="advanced-dialog document-tool-dialog"
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      onClose={closeDocumentTool}
      aria-labelledby="document-tool-title"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void executeDocumentTool(options);
        }}
      >
        <h2 id="document-tool-title">{t(documentToolLabels[tool])}</h2>
        <fieldset disabled={busy}>
          {tool === "create" && (
            <>
              <label>
                {t("Source")}
                <select
                  value={options.createMode}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      createMode: e.target.value as "blank" | "images",
                    })
                  }
                >
                  <option value="blank">{t("Page vierge")}</option>
                  <option value="images">{t("Images vers PDF")}</option>
                </select>
              </label>
              {options.createMode === "blank" ? (
                <div className="advanced-coordinates">
                  <NumberField
                    label={t("Largeur (points PDF)")}
                    value={options.width}
                    min={72}
                    max={2000}
                    onChange={(width) => setOptions({ ...options, width })}
                  />
                  <NumberField
                    label={t("Hauteur (points PDF)")}
                    value={options.height}
                    min={72}
                    max={2000}
                    onChange={(height) => setOptions({ ...options, height })}
                  />
                </div>
              ) : (
                <>
                  <label>
                    {t("Images PNG/JPEG")}
                    <input
                      type="file"
                      required
                      multiple
                      accept="image/png,image/jpeg"
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          files: Array.from(e.target.files ?? []),
                        })
                      }
                    />
                  </label>
                  <ol className="image-file-order">
                    {options.files.map((file, i) => (
                      <li key={`${file.name}-${i}`}>
                        {file.name}
                        <Button
                          aria-label={t("Monter")}
                          disabled={i === 0}
                          onClick={() => {
                            const files = [...options.files];
                            [files[i - 1], files[i]] = [files[i], files[i - 1]];
                            setOptions({ ...options, files });
                          }}
                        >
                          ↑
                        </Button>
                        <Button
                          aria-label={t("Descendre")}
                          disabled={i === options.files.length - 1}
                          onClick={() => {
                            const files = [...options.files];
                            [files[i + 1], files[i]] = [files[i], files[i + 1]];
                            setOptions({ ...options, files });
                          }}
                        >
                          ↓
                        </Button>
                      </li>
                    ))}
                  </ol>
                  <p>
                    {t(
                      "Une image par page A4, sans déformation. 100 Mo maximum au total.",
                    )}
                  </p>
                </>
              )}
            </>
          )}
          {tool === "office" && (
            <>
              <p>
                {t(
                  "Nécessite LibreOffice installé sur cet ordinateur. Conversion locale, sans service payant.",
                )}
              </p>
              <label>
                {t("Document bureautique")}
                <input
                  required
                  type="file"
                  accept=".doc,.docx,.odt,.xls,.xlsx,.ods,.ppt,.pptx,.odp,.rtf"
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      files: Array.from(e.target.files ?? []),
                    })
                  }
                />
              </label>
            </>
          )}
          {tool === "export" && (
            <>
              <label>
                {t("Format")}
                <select
                  value={options.format}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      format: e.target.value as DocumentToolOptions["format"],
                    })
                  }
                >
                  <option value="pdf">PDF</option>
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="text">{t("Texte brut (.txt)")}</option>
                </select>
              </label>
              {(options.format === "png" || options.format === "jpeg") && (
                <>
                  <NumberField
                    label={t("Résolution (DPI)")}
                    value={options.dpi}
                    min={72}
                    max={300}
                    onChange={(dpi) => setOptions({ ...options, dpi })}
                  />
                  <p>
                    {t(
                      "Plusieurs pages : archive ZIP. Le côté le plus long est limité à 5 000 pixels.",
                    )}
                  </p>
                </>
              )}
            </>
          )}
          {(tool === "export" || tool === "split") && (
            <label>
              {t("Pages")}
              <input
                value={options.ranges}
                placeholder={tool === "split" ? "1-3;4-6" : "1-3,5"}
                onChange={(e) =>
                  setOptions({ ...options, ranges: e.target.value })
                }
              />
            </label>
          )}
          {tool === "export" && (
            <p>{t("Vide : toutes les pages. Exemple : 1-3,5.")}</p>
          )}
          {tool === "split" && (
            <p>
              {t(
                "Vide : un PDF par page. Séparez les groupes par ; (exemple : 1-3;4-6). Résultat dans une archive ZIP.",
              )}
            </p>
          )}
          {tool === "protect" && (
            <>
              <p>
                {t(
                  "Exporte une copie chiffrée AES-256. Le document ouvert reste modifiable.",
                )}
              </p>
              <label>
                {t("Mot de passe d’ouverture")}
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={options.password}
                  onChange={(e) =>
                    setOptions({ ...options, password: e.target.value })
                  }
                />
              </label>
              <label>
                {t("Confirmer le mot de passe")}
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={options.confirmPassword}
                  onChange={(e) =>
                    setOptions({ ...options, confirmPassword: e.target.value })
                  }
                />
              </label>
            </>
          )}
          {tool === "compress" && (
            <p>
              {t(
                "Compression sans perte : conserve le texte, les images et les formulaires. Le gain dépend du document ; le fichier exporté ne sera pas plus volumineux que l’export standard.",
              )}
            </p>
          )}
          {tool === "form-data" && (
            <>
              <FormFieldInputs
                fields={formFields}
                values={options.values}
                onChange={(name, value) =>
                  setOptions({
                    ...options,
                    values: { ...options.values, [name]: value },
                  })
                }
                t={t}
              />
              <label>
                {t("Action")}
                <select
                  value={options.formAction}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      formAction: e.target
                        .value as DocumentToolOptions["formAction"],
                    })
                  }
                >
                  <option value="fill">{t("Appliquer les réponses")}</option>
                  <option value="json">
                    {t("Exporter les réponses en JSON")}
                  </option>
                  <option value="flatten">
                    {t("Exporter une copie non interactive")}
                  </option>
                </select>
              </label>
            </>
          )}
        </fieldset>
        {operationError && (
          <div className="advanced-error" role="alert">
            <p>{operationError.summary}</p>
            <OperationErrorDetails
              details={operationError.details}
              fontRelated={false}
              canLoadFont={false}
              onLoadFont={() => {}}
              t={t}
            />
          </div>
        )}
        <div className="advanced-actions">
          <Button disabled={busy} onClick={() => ref.current?.close()}>
            {t("Fermer")}
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={busy || (tool === "form-data" && !formFields.length)}
          >
            {t(busy ? "Traitement…" : "Appliquer")}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
