import { useComparisonTools } from "../hooks/useComparisonTools";
import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";
import { NumberField } from "../ui/NumberField";
export function ComparisonPanel() {
  const tools = useComparisonTools(),
    { t, busy } = useEditor();
  return (
    <div>
      <label>
        {t("PDF à comparer au document ouvert")}
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => tools.setFile(e.target.files?.[0])}
        />
      </label>
      <NumberField
        label={t("Page")}
        value={tools.page}
        min={1}
        onChange={tools.setPage}
      />
      <Button
        variant="primary"
        disabled={busy || !tools.file}
        onClick={() => void tools.compare()}
      >
        {t("Comparer")}
      </Button>
      {tools.result && (
        <>
          <p>
            {t("Pixels différents")} :{" "}
            {(
              (100 * tools.result.changedPixels) /
              tools.result.totalPixels
            ).toFixed(2)}{" "}
            % · {tools.result.leftPages} / {tools.result.rightPages}{" "}
            {t("pages")}
          </p>
          <div className="comparison-images">
            {tools.images.map((url, i) => (
              <figure key={i}>
                <figcaption>
                  {t(
                    [
                      "Document ouvert",
                      "Second document",
                      "Différences en rouge",
                    ][i],
                  )}
                </figcaption>
                <img
                  src={url}
                  alt={t(
                    [
                      "Document ouvert",
                      "Second document",
                      "Différences en rouge",
                    ][i],
                  )}
                />
              </figure>
            ))}
          </div>
          <div className="text-comparison">
            {tools.result.changes.map((change, i) =>
              change.added ? (
                <ins key={i}>{change.value}</ins>
              ) : change.removed ? (
                <del key={i}>{change.value}</del>
              ) : (
                <span key={i}>{change.value}</span>
              ),
            )}
          </div>
          <Button onClick={() => void tools.report()}>
            {t("Exporter le rapport")}
          </Button>
        </>
      )}
    </div>
  );
}
