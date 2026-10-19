import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";
export function TableEditorDialog() {
  const { tableEditor: editor, busy, t } = useEditor(),
    draft = editor.draft;
  if (!draft) return null;
  return (
    <dialog
      ref={editor.dialog}
      className="table-editor-dialog"
      onClose={editor.cancel}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      aria-labelledby="table-editor-title"
    >
      <h2 id="table-editor-title">{t("Modifier le tableau")}</h2>
      <p>
        {t(
          "Vérifiez les cellules détectées avant d’appliquer. Le tableau est reconstruit dans sa zone d’origine avec un style uniforme ; les formules ne sont pas recalculées. Grilles sans cellules fusionnées, texte sélectionnable uniquement. Maximum : 100 lignes et 20 colonnes.",
        )}
      </p>
      <fieldset disabled={busy}>
        <div className="table-editor-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("Lignes")}</th>
                {draft.widths.map((_, c) => (
                  <th key={c}>
                    {t("Colonne")} {c + 1}
                    <Button
                      title={t("Insérer une colonne avant")}
                      disabled={draft.widths.length >= 20}
                      onClick={() => editor.column(c, true)}
                    >
                      +
                    </Button>
                    <Button
                      title={t("Supprimer la colonne")}
                      disabled={draft.widths.length <= 1}
                      onClick={() => editor.column(c, false)}
                    >
                      −
                    </Button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {draft.cells.map((row, r) => (
                <tr key={r}>
                  <th>
                    {r + 1}
                    <Button
                      title={t("Insérer une ligne avant")}
                      disabled={draft.cells.length >= 100}
                      onClick={() => editor.row(r, true)}
                    >
                      +
                    </Button>
                    <Button
                      title={t("Supprimer la ligne")}
                      disabled={draft.cells.length <= 1}
                      onClick={() => editor.row(r, false)}
                    >
                      −
                    </Button>
                  </th>
                  {row.map((value, c) => (
                    <td key={c}>
                      <textarea
                        rows={2}
                        value={value}
                        aria-label={`${t("Ligne")} ${r + 1}, ${t("Colonne")} ${c + 1}`}
                        onChange={(e) => editor.cell(r, c, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-editor-actions">
          <Button
            variant="secondary"
            disabled={draft.cells.length >= 100}
            onClick={() => editor.row(draft.cells.length, true)}
          >
            {t("Ajouter une ligne")}
          </Button>
          <Button
            variant="secondary"
            disabled={draft.widths.length >= 20}
            onClick={() => editor.column(draft.widths.length, true)}
          >
            {t("Ajouter une colonne")}
          </Button>
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
          disabled={busy}
          onClick={() => void editor.apply()}
        >
          {t("Appliquer le tableau")}
        </Button>
      </div>
    </dialog>
  );
}
