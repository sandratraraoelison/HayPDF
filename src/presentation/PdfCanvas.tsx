import type { DocumentModel, NativeText, PageModel } from "../domain/document";
import { usePdfPage } from "./hooks/usePdfPage";
import { MarkOverlay } from "./components/MarkOverlay";
import { Button } from "./ui/Button";
import type { Rect } from "../domain/imageLayout";
interface PdfCanvasProps {
  doc: DocumentModel;
  page: PageModel;
  scale: number;
  selected?: string;
  onPlace?: (x: number, y: number) => void;
  onSelect?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, rect: Rect) => void;
  onNativeSelect?: (block: NativeText) => void;
  t?: (text: string) => string;
}
export function PdfCanvas({
  doc,
  page,
  scale,
  selected,
  onPlace,
  onSelect,
  onMove,
  onResize,
  onNativeSelect,
  t = (text) => text,
}: PdfCanvasProps) {
  const { canvas, size, error, nativeBlocks } = usePdfPage(
    doc,
    page,
    scale,
    !!onNativeSelect,
  );
  return (
    <div
      className="pdf-page"
      style={size}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onPlace?.(
          (event.clientX - rect.left) / scale,
          (event.clientY - rect.top) / scale,
        );
      }}
    >
      <canvas ref={canvas} style={size} />
      {error && <div className="render-error">{t(error)}</div>}
      {onNativeSelect &&
        nativeBlocks.map((block, index) => (
          <Button
            key={index}
            className="native-block"
            title={t("Modifier le texte existant")}
            style={{
              left: block.x * scale,
              top: block.y * scale,
              width: block.width * scale,
              height: block.height * scale,
            }}
            onClick={(event) => {
              event.stopPropagation();
              onNativeSelect(block);
            }}
          />
        ))}
      {page.marks
        .filter((mark) => !mark.invisible)
        .map((mark) => (
          <MarkOverlay
            key={mark.id}
            mark={mark}
            scale={scale}
            selected={selected === mark.id}
            t={t}
            onSelect={onSelect}
            onMove={onMove}
            onResize={onResize}
            bounds={{ width: size.width / scale, height: size.height / scale }}
          />
        ))}
    </div>
  );
}
