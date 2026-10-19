import { NumberField } from "../ui/NumberField";
import { Button } from "../ui/Button";
import { useEditor } from "../EditorContext";
import { Trash2 } from "lucide-react";
import type { Mark } from "../../domain/document";
import { ShapePicker } from "./ShapePicker";
export function TextProperties({
  showContent = true,
}: {
  showContent?: boolean;
}) {
  const {
    t,
    text,
    setText,
    size,
    setSize,
    color,
    setColor,
    font,
    setFont,
    mark,
    updateMark,
    deleteSelected,
    tool,
    shape,
    chooseShape,
  } = useEditor();
  const kind = mark?.kind ?? tool;
  const isText = !["rectangle", "highlight"].includes(kind);
  return (
    <section>
      <div className="section-label">
        {mark
          ? t("ÉLÉMENT SÉLECTIONNÉ")
          : t(isText ? "STYLE DU TEXTE" : "STYLE DE LA FORME")}
      </div>
      {kind === "rectangle" && (
        <ShapePicker
          value={mark ? (mark.shape ?? "rectangle") : shape}
          t={t}
          onChange={(value) => {
            chooseShape(value, true);
          }}
        />
      )}
      {isText && (
        <label>
          {t("Police")}
          <select
            value={mark?.font || font}
            onChange={(e) => {
              setFont(e.target.value as Mark["font"]);
              updateMark({ font: e.target.value as Mark["font"] });
            }}
          >
            <option value="Helvetica">Helvetica</option>
            <option value="TimesRoman">Times New Roman</option>
            <option value="Courier">Courier</option>
          </select>
        </label>
      )}
      <div className="property-row">
        {isText && (
          <NumberField
            label={t("Taille")}
            value={mark?.size || size}
            min={6}
            max={144}
            onChange={(value) => {
              setSize(value);
              updateMark({ size: value });
            }}
          />
        )}
        <label>
          {t("Couleur")}
          <input
            type="color"
            value={mark?.color || color}
            onChange={(e) => {
              setColor(e.target.value);
              updateMark({ color: e.target.value });
            }}
          />
        </label>
      </div>
      {isText && showContent && (
        <label>
          {t("Contenu")}
          <textarea
            rows={3}
            value={mark?.text ?? text}
            onChange={(e) => {
              setText(e.target.value);
              updateMark({ text: e.target.value });
            }}
          />
        </label>
      )}
      {mark && (
        <>
          <div className="property-row">
            <NumberField
              label={t("Largeur")}
              value={mark.width}
              min={10}
              onChange={(width) => updateMark({ width })}
            />
            <NumberField
              label={t("Hauteur")}
              value={mark.height}
              min={10}
              onChange={(height) => updateMark({ height })}
            />
          </div>
          <Button variant="danger" onClick={deleteSelected}>
            <Trash2 size={15} />
            {t("Supprimer l’élément")}
          </Button>
        </>
      )}
    </section>
  );
}
