import type { Mark } from "../../domain/document";
import { useEditor } from "../EditorContext";
import { useRasterTextEditor } from "../hooks/useRasterTextEditor";
import { Button } from "../ui/Button";
export function RasterTextEditor({ mark }: { mark: Mark }) {
  const { doc, page, commitDocument, t, busy } = useEditor();
  const editor = useRasterTextEditor(doc, page!.id, mark, commitDocument);
  return (
    <details>
      <summary>{t("Modifier le texte dans l’image")}</summary>
      <p>
        {t(
          "Réutilise les caractères reconnus sur un fond uniforme blanc, gris ou coloré. Vérifiez le style dans l’aperçu. La zone originale est masquée, pas supprimée.",
        )}
      </p>
      <label>
        {t("Nouveau texte")}
        <textarea
          value={editor.text}
          maxLength={500}
          rows={2}
          onChange={(e) => editor.setText(e.target.value)}
        />
      </label>
      <Button
        variant="secondary"
        disabled={busy || editor.busy}
        onClick={() => void editor.prepare()}
      >
        {t("Aperçu")}
      </Button>
      {editor.error && (
        <p role="alert">
          {editor.error.startsWith("RASTER_MISSING:")
            ? `${t("Caractère indisponible dans l’image :")} ${editor.error.slice(16)}`
            : t(
                editor.error === "RASTER_OVERFLOW"
                  ? "Le texte dépasse la largeur de la ligne."
                  : "Une seule ligne de 500 caractères maximum.",
              )}
        </p>
      )}
      {editor.preview && (
        <>
          <img
            src={editor.preview}
            alt={t("Aperçu du texte recomposé")}
            style={{ maxWidth: "100%", background: "white" }}
          />
          <Button variant="primary" disabled={busy} onClick={editor.apply}>
            {t("Appliquer")}
          </Button>
        </>
      )}
    </details>
  );
}
