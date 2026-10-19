import { useEditor } from "../EditorContext";
import { MousePointer2, FileText } from "lucide-react";
import { NativeTextPanel } from "./NativeTextPanel";
import { OcrResultsPanel } from "./OcrResultsPanel";
import { TextProperties } from "./TextProperties";
import { ImageProperties } from "./ImageProperties";

export function PropertiesSidebar() {
  const { t, doc, nativeBlock, page, mark, tool } = useEditor();
  const hasProperties =
    !!doc &&
    (!!mark ||
      !!nativeBlock ||
      ["text", "signature", "stamp", "rectangle", "highlight"].includes(tool));
  return (
    <aside className="properties" aria-label={t("Propriétés")}>
      <div className="sidebar-title">
        {t("Propriétés")}
        {hasProperties && <span className="tiny-label">{t("ÉDITION")}</span>}
      </div>
      {nativeBlock && <NativeTextPanel />}
      {hasProperties ? (
        mark?.kind === "image" ? (
          <ImageProperties />
        ) : (
          <TextProperties showContent={!nativeBlock} />
        )
      ) : (
        <div className="properties-empty">
          {doc ? (
            <MousePointer2 size={28} aria-hidden="true" />
          ) : (
            <FileText size={28} aria-hidden="true" />
          )}
          <h3>
            {t(doc ? "Aucun élément sélectionné" : "Aucun document ouvert")}
          </h3>
          <p>
            {t(
              doc
                ? "Sélectionnez un élément ou choisissez un outil pour afficher ses réglages."
                : "Ouvrez ou créez un PDF pour commencer. Les réglages apparaîtront ici selon votre sélection.",
            )}
          </p>
        </div>
      )}
      {page?.marks.some((m) => m.invisible) && <OcrResultsPanel />}
    </aside>
  );
}
