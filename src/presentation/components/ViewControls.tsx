import { Button } from "../ui/Button";
import { useEditor } from "../EditorContext";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
export function ViewControls() {
  const { t, doc, pageIndex, selectPage, scale, setScale, zoom, fit } =
    useEditor();
  return (
    <div className="viewbar">
      <span>
        <span className="status-dot" />
        {doc
          ? `${doc.pages.length} page${doc.pages.length > 1 ? "s" : ""}`
          : t("Prêt à créer")}
      </span>
      {doc && (
        <div>
          <Button
            title={t("Page précédente")}
            disabled={!doc || pageIndex === 0}
            onClick={() => selectPage(pageIndex - 1)}
          >
            <ChevronLeft size={16} />
          </Button>
          <span>
            {doc ? pageIndex + 1 : "—"} / {doc?.pages.length || "—"}
          </span>
          <Button
            title={t("Page suivante")}
            disabled={!doc || pageIndex >= doc.pages.length - 1}
            onClick={() => selectPage(pageIndex + 1)}
          >
            <ChevronRight size={16} />
          </Button>
          <i />
          <Button title={t("Réduire")} onClick={() => zoom(-1)}>
            <ZoomOut size={17} />
          </Button>
          <Button
            title={`${t("Taille réelle (100 %)")} (Ctrl+0)`}
            onClick={() => setScale(1)}
          >
            {Math.round(scale * 100)} %
          </Button>
          <Button title={t("Agrandir")} onClick={() => zoom(1)}>
            <ZoomIn size={17} />
          </Button>
          <Button
            title={`${t("Ajuster à la largeur")} (Ctrl+1)`}
            onClick={() => fit("width")}
          >
            {t("Largeur")}
          </Button>
          <Button
            title={`${t("Ajuster à la page")} (Ctrl+2)`}
            onClick={() => fit("page")}
          >
            {t("Page")}
          </Button>
        </div>
      )}
    </div>
  );
}
