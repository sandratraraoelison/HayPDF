import { RasterTextEditor } from "./RasterTextEditor";
import { OcrLineEditor } from "./OcrLineEditor";
import { useEditor } from "../EditorContext";
export function OcrResultsPanel() {
  const { t, page, mark } = useEditor();
  if (!page) return null;
  return (
    <section className="ocr-results">
      <div className="section-label">{t("Texte reconnu")}</div>
      <p>
        {t(
          "Modifiez une ligne puis validez pour appliquer la correction sur l’image. L’annulation reste disponible.",
        )}
      </p>
      {page.marks
        .filter((m) => m.invisible)
        .filter((m) => !mark?.invisible || m.id === mark.id)
        .map((m, i) => (
          <div key={m.id}>
            <OcrLineEditor mark={m} number={i + 1} />
            {m.rasterLine && <RasterTextEditor mark={m} />}
            {!m.rasterLine && (
              <p>
                {t(
                  "Relancez l’OCR. Si le fond reste incompatible, cette ligne ne peut pas être modifiée visuellement.",
                )}
              </p>
            )}
          </div>
        ))}
    </section>
  );
}
