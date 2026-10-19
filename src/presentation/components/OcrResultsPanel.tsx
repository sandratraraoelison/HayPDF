import { useEditor } from "../EditorContext";
export function OcrResultsPanel() {
  const { t, page, updateOcrText } = useEditor();
  if (!page) return null;
  return (
    <section className="ocr-results">
      <div className="section-label">{t("Texte reconnu")}</div>
      <p>
        {t(
          "Le texte reconnu est ajouté comme couche recherchable invisible. Corrigez les résultats avant l’export.",
        )}
      </p>
      {page.marks
        .filter((m) => m.invisible)
        .map((m, i) => (
          <label key={m.id}>
            {i + 1}
            <textarea
              value={m.text}
              rows={2}
              onChange={(e) => updateOcrText(m.id, e.target.value)}
            />
          </label>
        ))}
    </section>
  );
}
