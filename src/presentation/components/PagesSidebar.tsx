import { Button } from "../ui/Button";
import { useEditor } from "../EditorContext";
import { Check, FilePlus2, Layers } from "lucide-react";
import { PageActions } from "./PageActions";
import { PdfCanvas } from "./PdfCanvas";
export function PagesSidebar() {
  const { t, doc, selectPage, busy, mergeInput, page } = useEditor();
  return (
    <aside className="pages-sidebar">
      <div className="sidebar-title">
        {t("Pages")}
        <span>{doc?.pages.length || 0}</span>
      </div>
      {doc ? (
        <div className="thumbnails">
          {doc.pages.map((p, i) => (
            <Button
              key={p.id}
              className={`thumbnail ${page?.id === p.id ? "current" : ""}`}
              onClick={() => selectPage(i)}
            >
              <div className="thumb-paper">
                <PdfCanvas doc={doc} page={p} scale={0.19} t={t} />
              </div>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {page?.id === p.id && <Check size={13} />}
            </Button>
          ))}
        </div>
      ) : (
        <div className="empty-pages">
          <Layers size={28} />
          <p>
            {t("Les pages de votre")}
            <br />
            {t("document apparaîtront ici")}
          </p>
        </div>
      )}
      {doc && <PageActions />}
      {doc && (
        <Button
          className="merge button"
          disabled={!doc || busy}
          onClick={() => mergeInput.current?.click()}
        >
          <FilePlus2 size={16} />
          {t("Ajouter un PDF")}
        </Button>
      )}
    </aside>
  );
}
