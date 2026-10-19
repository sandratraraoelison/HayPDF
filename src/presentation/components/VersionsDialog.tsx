import { useEffect, useRef, useState } from "react";
import {
  BookmarkPlus,
  GitCompareArrows,
  History,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";
import { OperationErrorDetails } from "./OperationErrorDetails";

export function VersionsDialog() {
  const editor = useEditor();
  const {
    t,
    busy,
    doc,
    language,
    pageIndex,
    versions,
    versionName,
    setVersionName,
    selectedVersion,
    selectedVersionId,
    setSelectedVersionId,
    saveVersion,
    restoreVersion,
    removeVersion,
    compareVersion,
    versionComparison,
    versionImages,
    operationError,
    setShowVersions,
  } = editor;
  const dialog = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<"split" | "difference">("split");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="advanced-dialog versions-dialog"
      aria-labelledby="versions-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      onClose={() => setShowVersions(false)}
    >
      <div className="workbench-heading">
        <h2 id="versions-title">
          <History size={22} aria-hidden="true" />
          {t("Atelier de versions")}
        </h2>
        <Button
          aria-label={t("Fermer")}
          disabled={busy}
          onClick={() => dialog.current?.close()}
        >
          <X size={20} />
        </Button>
      </div>
      <p>
        {t(
          "Gardez vos étapes importantes, comparez le rendu PDF et revenez à une version en une action annulable.",
        )}
      </p>
      <p className="versions-session-note">
        {t(
          "Versions locales pour ce document : elles sont effacées à l’ouverture d’un autre document ou à la fermeture de l’application.",
        )}
      </p>
      <fieldset disabled={busy}>
        <form
          className="version-capture"
          onSubmit={(event) => {
            event.preventDefault();
            saveVersion();
          }}
        >
          <label htmlFor="version-name">
            {t("Nom de la version")}
            <input
              id="version-name"
              value={versionName}
              maxLength={100}
              placeholder={t("Ex. Avant correction, prêt à envoyer…")}
              onChange={(event) => setVersionName(event.target.value)}
            />
          </label>
          <Button variant="primary" type="submit" disabled={!doc}>
            <BookmarkPlus size={17} aria-hidden="true" />
            {t("Garder cette étape")}
          </Button>
        </form>
        <div className="versions-layout">
          <div
            className="versions-list"
            aria-label={t("Versions enregistrées")}
          >
            {versions.length === 0 && (
              <div className="versions-empty">
                <History size={30} aria-hidden="true" />
                <p>
                  {t(
                    "Aucune version enregistrée. Gardez une étape avant votre prochaine modification.",
                  )}
                </p>
              </div>
            )}
            {versions.map((version) => (
              <div className="version-entry" key={version.id}>
                <Button
                  className="version-select"
                  aria-pressed={selectedVersionId === version.id}
                  onClick={() => setSelectedVersionId(version.id)}
                >
                  <strong>{version.name}</strong>
                  <span>
                    {new Date(version.createdAt).toLocaleTimeString(language, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {version.document.pages.length} {t("pages")}
                  </span>
                </Button>
                <Button
                  className="version-delete"
                  aria-label={`${t("Supprimer la version")} : ${version.name}`}
                  onClick={() => removeVersion(version.id)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
          <div className="version-detail">
            {selectedVersion ? (
              <>
                <h3>{selectedVersion.name}</h3>
                <p>
                  {t("Page comparée")} : {pageIndex + 1} ·{" "}
                  {t(
                    "La comparaison inclut vos annotations et les modifications du texte.",
                  )}
                </p>
                <div className="workbench-actions">
                  <Button
                    variant="secondary"
                    onClick={() => void compareVersion()}
                  >
                    <GitCompareArrows size={17} aria-hidden="true" />
                    {t("Comparer au document actuel")}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={selectedVersion.document === doc}
                    onClick={restoreVersion}
                  >
                    <RotateCcw size={17} aria-hidden="true" />
                    {t("Restaurer cette version")}
                  </Button>
                </div>
                {versionComparison && (
                  <>
                    <p role="status">
                      {versionComparison.changedPixels === 0
                        ? t("Aucune différence visuelle sur cette page.")
                        : `${((100 * versionComparison.changedPixels) / versionComparison.totalPixels).toFixed(2)} % · ${t("de pixels différents sur cette page")}`}
                    </p>
                    <div className="version-view-tabs">
                      <Button
                        aria-pressed={view === "split"}
                        onClick={() => setView("split")}
                      >
                        {t("Avant / après")}
                      </Button>
                      <Button
                        aria-pressed={view === "difference"}
                        onClick={() => setView("difference")}
                      >
                        {t("Différences en rouge")}
                      </Button>
                    </div>
                    <div
                      className={`version-images ${view === "split" ? "version-images-split" : ""}`}
                    >
                      {(view === "split" ? [0, 1] : [2]).map(
                        (index) =>
                          versionImages[index] && (
                            <figure key={index}>
                              <figcaption>
                                {t(
                                  [
                                    "Version enregistrée",
                                    "Document actuel",
                                    "Différences en rouge",
                                  ][index],
                                )}
                              </figcaption>
                              {index === 0 &&
                              pageIndex >=
                                selectedVersion.document.pages.length ? (
                                <div className="version-page-absent">
                                  {t(
                                    "Cette page n’existait pas dans cette version.",
                                  )}
                                </div>
                              ) : (
                                <img
                                  src={versionImages[index]}
                                  alt={t(
                                    [
                                      "Version enregistrée",
                                      "Document actuel",
                                      "Différences en rouge",
                                    ][index],
                                  )}
                                />
                              )}
                            </figure>
                          ),
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              versions.length > 0 && (
                <p>
                  {t(
                    "Choisissez une version pour la comparer ou la restaurer.",
                  )}
                </p>
              )
            )}
          </div>
        </div>
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
    </dialog>
  );
}
