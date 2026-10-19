import { useSearchTools } from "../hooks/useSearchTools";
import { useWorkbench } from "../WorkbenchContext";
import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";
export function SearchIndexPanel() {
  const tools = useSearchTools(),
    { closeFeature } = useWorkbench(),
    { t, busy } = useEditor();
  return (
    <div>
      <p>
        {t(
          "Index local persistant : les PDF et leur texte sont conservés sur cet appareil. Les scans doivent avoir une couche OCR pour être recherchables.",
        )}
      </p>
      <label>
        {t("Indexer des PDF")}
        <input
          multiple
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            void tools.add(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </label>
      <ul>
        {tools.index.map((doc) => (
          <li key={doc.id}>
            {doc.name} · {doc.pages.length} {t("pages")}{" "}
            <Button onClick={() => void tools.remove(doc.id)}>
              {t("Retirer de l’index")}
            </Button>
          </li>
        ))}
      </ul>
      <label>
        {t("Rechercher")}
        <input
          type="search"
          value={tools.query}
          onChange={(e) => tools.setQuery(e.target.value)}
        />
      </label>
      <ul className="review-list">
        {tools.hits.map((hit) => (
          <li key={`${hit.id}-${hit.page}`}>
            <strong>
              {hit.name} · {t("Page")} {hit.page + 1}
            </strong>
            <p>{hit.excerpt}</p>
            <Button
              disabled={busy}
              onClick={() => {
                void tools.open(hit.id, hit.page).then(closeFeature);
              }}
            >
              {t("Ouvrir le PDF")}
            </Button>
          </li>
        ))}
      </ul>
      <Button onClick={() => void tools.exportIndex()}>
        {t("Exporter l’index texte")}
      </Button>
    </div>
  );
}
