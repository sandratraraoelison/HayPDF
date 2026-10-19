import { useAuditTools } from "../hooks/useAuditTools";
import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";
import { NumberField } from "../ui/NumberField";
export function AuditToolsPanel({
  mode,
}: {
  mode: "prepress" | "accessibility" | "standards" | "javascript";
}) {
  const tools = useAuditTools(),
    { t, busy } = useEditor();
  if (mode === "javascript")
    return (
      <div>
        <p>
          {t(
            "Le script est intégré au PDF pour les lecteurs compatibles. HayPDF ne l’exécute pas dans Electron.",
          )}
        </p>
        <label>
          {t("Nom du script")}
          <input
            value={tools.scriptName}
            onChange={(e) => tools.setScriptName(e.target.value)}
          />
        </label>
        <label>
          JavaScript
          <textarea
            className="code-editor"
            rows={14}
            spellCheck={false}
            value={tools.script}
            onChange={(e) => tools.setScript(e.target.value)}
          />
        </label>
        <Button
          variant="primary"
          disabled={busy || !tools.script.trim()}
          onClick={() => void tools.saveScript()}
        >
          {t("Intégrer le script")}
        </Button>
      </div>
    );
  return (
    <div>
      {mode === "prepress" && (
        <>
          <p>
            {t(
              "Inspection des polices utilisées, résolution effective des images et boîtes de page. Le rapport ne certifie pas la conformité PDF/X.",
            )}
          </p>
          <div className="advanced-coordinates">
            <NumberField
              label={t("Retrait de coupe (mm)")}
              value={tools.inset}
              min={0}
              onChange={tools.setInset}
            />
            <NumberField
              label={t("Fond perdu (mm)")}
              value={tools.bleed}
              min={0}
              max={tools.inset}
              onChange={tools.setBleed}
            />
          </div>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => void tools.savePrintBoxes()}
          >
            {t("Appliquer les boîtes de coupe et fond perdu")}
          </Button>
          <ul>
            {tools.audit?.pages.map((page, i) => (
              <li key={i}>
                {t("Page")} {i + 1} : {page.width.toFixed(1)} ×{" "}
                {page.height.toFixed(1)} pt<p>{page.fonts.join(", ")}</p>
                <ul>
                  {page.images.map((image, j) => (
                    <li key={j}>
                      {image.width} × {image.height} px · {image.dpi.toFixed(0)}{" "}
                      DPI
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
      {(mode === "accessibility" || mode === "standards") && (
        <>
          <label>
            {t("Titre du document")}
            <input
              value={tools.title}
              onChange={(e) => tools.setTitle(e.target.value)}
            />
          </label>
          <label>
            {t("Langue du document")}
            <input
              value={tools.language}
              onChange={(e) => tools.setLanguage(e.target.value)}
            />
          </label>
        </>
      )}
      {mode === "accessibility" && (
        <>
          <p>
            {t(
              tools.audit?.tagged
                ? "Le document possède une structure balisée. Vérifiez l’ordre de lecture et les descriptions."
                : "Ce PDF n’est pas balisé. Les métadonnées seules ne suffisent pas à le rendre conforme PDF/UA.",
            )}
          </p>
          {tools.alternatives.map((item, i) => (
            <label key={item.path.join(".")}>
              {t("Description de la figure")} {i + 1}
              <textarea
                value={item.alt}
                onChange={(e) =>
                  tools.setAlternatives(
                    tools.alternatives.map((old, n) =>
                      n === i ? { ...old, alt: e.target.value } : old,
                    ),
                  )
                }
              />
            </label>
          ))}
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => void tools.saveMetadata()}
          >
            {t("Appliquer les métadonnées et descriptions")}
          </Button>
          <p>
            {t(
              "La transcription recomposée conserve le texte extrait, mais pas la mise en page ni les figures du PDF original.",
            )}
          </p>
          <div className="workbench-actions">
            <Button onClick={() => void tools.exportTranscript()}>
              {t("Exporter une transcription HTML accessible")}
            </Button>
            <Button onClick={() => void tools.exportTranscript(true)}>
              {t("Exporter une transcription PDF balisée")}
            </Button>
          </div>
          <ol className="tag-list">
            {tools.audit?.tags.map((tag) => (
              <li key={tag.path.join(".")}>
                {tag.role} {tag.alt}
                {(tag.path.at(-1) ?? -1) >= 0 && (
                  <>
                    <Button
                      disabled={tag.path.at(-1) === 0}
                      onClick={() => void tools.moveTag(tag.path, -1)}
                    >
                      {t("Monter")}
                    </Button>
                    <Button onClick={() => void tools.moveTag(tag.path, 1)}>
                      {t("Descendre")}
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
      {mode === "standards" && (
        <>
          <p>
            {t(
              "La copie d’archivage PDF/A-2b est une version visuelle aplatie : texte non sélectionnable, formulaires et pièces jointes retirés. Contrôlez le résultat avec veraPDF.",
            )}
          </p>
          <NumberField
            label={t("Résolution (DPI)")}
            value={tools.dpi}
            min={72}
            max={600}
            onChange={tools.setDpi}
          />
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => void tools.archive()}
          >
            {t("Exporter la copie d’archivage PDF/A-2b")}
          </Button>
          <label>
            {t("Profil de validation")}
            <select
              value={tools.flavour}
              onChange={(e) => tools.setFlavour(e.target.value)}
            >
              <option value="2b">PDF/A-2b</option>
              <option value="1b">PDF/A-1b</option>
              <option value="ua1">PDF/UA-1</option>
              <option value="ua2">PDF/UA-2</option>
            </select>
          </label>
          <p>
            {t(
              "Validation locale avec veraPDF, embarqué dans la version Windows x64. Sur les autres plateformes, Java et veraPDF doivent être installés.",
            )}
          </p>
          <Button disabled={busy} onClick={() => void tools.validate()}>
            {t("Valider le PDF ouvert avec veraPDF")}
          </Button>
          {tools.validation && (
            <pre className="validation-report">{tools.validation}</pre>
          )}
        </>
      )}
      <Button disabled={busy} onClick={() => void tools.exportAudit()}>
        {t("Exporter le rapport d’inspection")}
      </Button>
    </div>
  );
}
