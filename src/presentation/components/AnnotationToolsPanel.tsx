import { useAnnotationTools } from "../hooks/useAnnotationTools";
import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";
import { NumberField } from "../ui/NumberField";
import { PdfAreaPreview } from "./PdfAreaPreview";
import { PdfCanvas } from "../PdfCanvas";
import type { Point, MeasurementKind } from "../../domain/workbench";
export function AnnotationToolsPanel({ mode }: { mode: "stamp" | "measure" }) {
  const tools = useAnnotationTools(),
    { doc, page, t, busy } = useEditor();
  if (!doc || !page) return null;
  if (mode === "stamp")
    return (
      <div>
        <label>
          {t("Texte du tampon")}
          <input
            value={tools.text}
            onChange={(e) => tools.setText(e.target.value)}
          />
        </label>
        <p>{t("Jetons disponibles : {date} et {page}.")}</p>
        <label>
          {t("Image du tampon (facultatif)")}
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => tools.setImage(e.target.files?.[0])}
          />
        </label>
        <div className="advanced-coordinates">
          {(["x", "y", "width", "height"] as const).map((key) => (
            <NumberField
              key={key}
              label={t(
                { x: "X", y: "Y", width: "Largeur", height: "Hauteur" }[key],
              )}
              value={tools.rect[key]}
              min={key === "x" || key === "y" ? 0 : 12}
              onChange={(value) =>
                tools.setRect({ ...tools.rect, [key]: value })
              }
            />
          ))}
        </div>
        <PdfAreaPreview
          doc={doc}
          page={page}
          area={tools.rect}
          onPosition={(x, y) => tools.setRect({ ...tools.rect, x, y })}
          t={t}
        />
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => void tools.saveStamp()}
        >
          {t("Ajouter le tampon")}
        </Button>
      </div>
    );
  return (
    <div>
      <label>
        {t("Mesure")}
        <select
          value={tools.kind}
          onChange={(e) => tools.setKind(e.target.value as MeasurementKind)}
        >
          <option value="distance">{t("Distance")}</option>
          <option value="perimeter">{t("Périmètre")}</option>
          <option value="area">{t("Surface")}</option>
        </select>
      </label>
      <p>
        {t(
          "Cliquez sur l’aperçu pour ajouter les points. Pour calibrer, placez les deux premiers points sur une distance connue.",
        )}
      </p>
      <div className="advanced-preview">
        <div
          className="measurement-preview"
          onClickCapture={(e) => {
            const sheet = e.currentTarget
              .querySelector(".pdf-page")
              ?.getBoundingClientRect();
            if (sheet) {
              const p: Point = {
                x: (e.clientX - sheet.left) / 0.5,
                y: (e.clientY - sheet.top) / 0.5,
              };
              if (
                p.x >= 0 &&
                p.y >= 0 &&
                p.x <= sheet.width / 0.5 &&
                p.y <= sheet.height / 0.5
              )
                tools.setPoints([...tools.points, p]);
            }
          }}
        >
          <PdfCanvas doc={doc} page={page} scale={0.5} t={t} />
          <svg className="measurement-lines">
            <polyline
              points={tools.points
                .map((p) => `${p.x * 0.5},${p.y * 0.5}`)
                .join(" ")}
              fill="none"
              stroke="#b06cff"
              strokeWidth="2"
            />
            {tools.points.map((p, i) => (
              <circle
                key={i}
                cx={p.x * 0.5}
                cy={p.y * 0.5}
                r="4"
                fill="#b06cff"
              />
            ))}
          </svg>
        </div>
      </div>
      <div className="workbench-actions">
        <Button onClick={() => tools.setPoints(tools.points.slice(0, -1))}>
          {t("Retirer le dernier point")}
        </Button>
        <Button onClick={() => tools.setPoints([])}>
          {t("Effacer les points")}
        </Button>
      </div>
      <div className="advanced-coordinates">
        <NumberField
          label={t("Distance connue")}
          min={0.000001}
          value={tools.knownLength}
          onChange={tools.setKnownLength}
        />
        <label>
          {t("Unité")}
          <input
            value={tools.unit}
            onChange={(e) => tools.setUnit(e.target.value)}
          />
        </label>
        <NumberField
          label={t("Unités par point PDF")}
          min={0.000001}
          value={tools.factor}
          onChange={tools.setFactor}
        />
      </div>
      <Button disabled={tools.points.length < 2} onClick={tools.calibrate}>
        {t("Calibrer sur les deux premiers points")}
      </Button>
      <output className="measurement-result">
        {tools.result?.toFixed(3) ?? "—"} {tools.unit}
        {tools.kind === "area" ? "²" : ""}
      </output>
      <Button
        variant="primary"
        disabled={busy || tools.result === undefined}
        onClick={() => void tools.saveMeasurement()}
      >
        {t("Inscrire la mesure dans le PDF")}
      </Button>
    </div>
  );
}
