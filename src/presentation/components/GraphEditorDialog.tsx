import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";
import { NumberField } from "../ui/NumberField";
import { GraphPreview } from "./GraphPreview";
import type { GraphKind } from "../../domain/graph";
export function GraphEditorDialog() {
  const { graphEditor: editor, busy, t } = useEditor(),
    draft = editor.draft;
  if (!draft) return null;
  return (
    <dialog
      ref={editor.dialog}
      className="graph-editor-dialog"
      onClose={editor.cancel}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      aria-labelledby="graph-editor-title"
    >
      <h2 id="graph-editor-title">{t("Modifier le graphique")}</h2>
      <p>
        {t(
          "Reconstituez le graphique dans la zone sélectionnée. Les données d’origine ne sont pas récupérées automatiquement : reprenez les libellés et les valeurs, puis vérifiez l’aperçu. Le style est remplacé ; le reste de la page est conservé. Maximum : 12 éléments, sans formules ni liens Excel.",
        )}
      </p>
      <details className="graph-source">
        <summary>{t("Textes de la zone d’origine")}</summary>
        <pre>
          {draft.sourceText || t("Aucun texte sélectionnable détecté.")}
        </pre>
      </details>
      <fieldset disabled={busy}>
        <div className="graph-settings">
          <label>
            {t("Type de graphique")}
            <select
              value={draft.kind}
              onChange={(e) =>
                editor.update({ kind: e.target.value as GraphKind })
              }
            >
              <option value="bars">{t("Histogramme")}</option>
              <option value="pie">{t("Camembert")}</option>
              <option value="process">{t("Diagramme de processus")}</option>
            </select>
          </label>
          <label>
            {t("Titre du graphique")}
            <input
              value={draft.title}
              onChange={(e) => editor.update({ title: e.target.value })}
            />
          </label>
        </div>
        <div className="graph-editor-body">
          <div className="graph-items">
            {draft.items.map((item, i) => (
              <section className="graph-item" key={i}>
                <div className="graph-item-heading">
                  <strong>
                    {t("Élément")} {i + 1}
                  </strong>
                  <Button
                    title={t("Monter")}
                    disabled={i === 0}
                    onClick={() => editor.move(i, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    title={t("Descendre")}
                    disabled={i === draft.items.length - 1}
                    onClick={() => editor.move(i, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    title={t("Supprimer l’élément")}
                    onClick={() => editor.remove(i)}
                  >
                    ×
                  </Button>
                </div>
                <label>
                  {t("Libellé")}
                  <input
                    value={item.label}
                    onChange={(e) => editor.item(i, { label: e.target.value })}
                  />
                </label>
                <div className="property-row">
                  {draft.kind === "process" ? (
                    <label>
                      {t("Sous-titre")}
                      <input
                        value={item.detail}
                        onChange={(e) =>
                          editor.item(i, { detail: e.target.value })
                        }
                      />
                    </label>
                  ) : (
                    <NumberField
                      label={t("Valeur")}
                      value={item.value}
                      min={0}
                      onChange={(value) => editor.item(i, { value })}
                    />
                  )}
                  <label>
                    {t("Couleur")}
                    <input
                      type="color"
                      value={item.color}
                      onChange={(e) =>
                        editor.item(i, { color: e.target.value })
                      }
                    />
                  </label>
                </div>
              </section>
            ))}
            <Button
              variant="secondary"
              disabled={draft.items.length >= 12}
              onClick={() =>
                editor.add(`${t("Élément")} ${draft.items.length + 1}`)
              }
            >
              {t("Ajouter un élément")}
            </Button>
          </div>
          <div className="graph-preview-panel">
            <h3>{t("Aperçu")}</h3>
            {editor.preview.layout ? (
              <GraphPreview
                draft={draft}
                layout={editor.preview.layout}
                label={t("Aperçu du graphique")}
              />
            ) : (
              <p>
                {t(
                  editor.preview.error ||
                    "Ajoutez les éléments du graphique pour afficher l’aperçu.",
                )}
              </p>
            )}
          </div>
        </div>
      </fieldset>
      {editor.error && (
        <p role="alert" className="table-error">
          {t(editor.error)}
        </p>
      )}
      <div className="table-editor-actions">
        <Button variant="secondary" disabled={busy} onClick={editor.cancel}>
          {t("Annuler")}
        </Button>
        <Button
          variant="primary"
          disabled={busy || !editor.preview.layout}
          onClick={() => void editor.apply()}
        >
          {t("Appliquer le graphique")}
        </Button>
      </div>
    </dialog>
  );
}
