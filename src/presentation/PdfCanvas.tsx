import type { DocumentModel, NativeText, PageModel } from "../domain/document";
import { usePdfPage } from "./hooks/usePdfPage";
import { MarkOverlay } from "./components/MarkOverlay";
import { Button } from "./ui/Button";
import type { Rect } from "../domain/imageLayout";
import type { NativeImage } from "../domain/nativeImage";
import type { StrokePoint } from "../domain/shapes";
import { FreehandLayer } from "./components/FreehandLayer";
import { AreaSelectionLayer } from "./components/AreaSelectionLayer";
interface PdfCanvasProps {
  doc: DocumentModel;
  page: PageModel;
  scale: number;
  selected?: string;
  onFreehand?: (points: StrokePoint[]) => void;
  drawingColor?: string;
  onAreaSelect?: (area: Rect) => void;
  areaLabel?: string;
  nativeImages?: NativeImage[];
  selectedImage?: NativeImage;
  onImageSelect?: (image: NativeImage) => void;
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
  onFreehand,
  drawingColor = "#393454",
  onAreaSelect,
  areaLabel,
  nativeImages = [],
  selectedImage,
  onImageSelect,
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
      {onAreaSelect && (
        <AreaSelectionLayer
          key={`${page.id}-${scale}`}
          width={size.width / scale}
          height={size.height / scale}
          scale={scale}
          onSelect={onAreaSelect}
          label={
            areaLabel ??
            t(
              "Encadrez un seul tableau, bordures comprises. Échap pour annuler.",
            )
          }
        />
      )}
      {onFreehand && (
        <FreehandLayer
          key={`${page.id}-${scale}`}
          width={size.width / scale}
          height={size.height / scale}
          scale={scale}
          color={drawingColor}
          onComplete={onFreehand}
          label={t("Tracez sur la page. Échap annule le trait en cours.")}
        />
      )}
      {error && <div className="render-error">{t(error)}</div>}
      {onImageSelect &&
        nativeImages.map((image) => (
          <Button
            key={image.index}
            className={`native-block contextual-block native-image-block${selectedImage === image ? " selected" : ""}`}
            aria-label={`${t(image.kind === "vector" ? "Illustration vectorielle" : "Image")} ${image.index + 1}`}
            aria-pressed={selectedImage === image}
            style={{
              left: image.x * scale,
              top: image.y * scale,
              width: image.width * scale,
              height: image.height * scale,
              zIndex: image.kind === "vector" ? 1 : 2,
              clipPath: image.polygon
                ? `polygon(${image.polygon.map((p) => `${((p.x - image.x) / image.width) * 100}% ${((p.y - image.y) / image.height) * 100}%`).join(",")})`
                : undefined,
            }}
            onClick={(event) => {
              event.stopPropagation();
              onImageSelect(image);
            }}
          />
        ))}
      {onNativeSelect &&
        nativeBlocks.map((block, index) => (
          <Button
            key={index}
            className="native-block contextual-block"
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
