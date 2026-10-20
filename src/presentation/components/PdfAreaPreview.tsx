import type { DocumentModel, PageModel } from "../../domain/document";
import type { Rect } from "../../domain/imageLayout";
import { PdfCanvas } from "./PdfCanvas";

export function PdfAreaPreview({
  doc,
  page,
  area,
  onPosition,
  t,
}: {
  doc: DocumentModel;
  page: PageModel;
  area: Rect;
  onPosition: (x: number, y: number) => void;
  t: (text: string) => string;
}) {
  const scale = 0.4;
  return (
    <div className="advanced-preview" aria-label={t("Aperçu de la zone")}>
      <div className="advanced-preview-sheet">
        <PdfCanvas
          doc={doc}
          page={page}
          scale={scale}
          onPlace={onPosition}
          t={t}
        />
        <div
          className="advanced-area"
          style={{
            left: area.x * scale,
            top: area.y * scale,
            width: area.width * scale,
            height: area.height * scale,
          }}
        />
      </div>
    </div>
  );
}
