import { Trash2 } from "lucide-react";
import { useEditor } from "../EditorContext";
import { NumberField } from "../ui/NumberField";
import { Button } from "../ui/Button";
import type { Mark } from "../../domain/document";
export function ImageProperties() {
  const { mark, updateMark, deleteSelected, t } = useEditor();
  if (mark?.kind !== "image") return null;
  return (
    <section className="image-properties">
      <div className="section-label">{t("IMAGE SÉLECTIONNÉE")}</div>
      <p>
        {t(
          "Déplacez l’image ou tirez ses poignées. Maj inverse temporairement le verrouillage des proportions.",
        )}
      </p>
      <div className="property-row">
        <NumberField
          label={t("Largeur")}
          value={Math.round(mark.width * 10) / 10}
          min={16}
          onChange={(width) => updateMark({ width })}
        />
        <NumberField
          label={t("Hauteur")}
          value={Math.round(mark.height * 10) / 10}
          min={16}
          onChange={(height) => updateMark({ height })}
        />
      </div>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={mark.lockAspectRatio !== false}
          onChange={(e) => updateMark({ lockAspectRatio: e.target.checked })}
        />
        {t("Conserver les proportions")}
      </label>
      <label>
        {t("Mode d’affichage")}
        <select
          value={mark.imageFit ?? "contain"}
          onChange={(e) =>
            updateMark({ imageFit: e.target.value as Mark["imageFit"] })
          }
        >
          <option value="contain">{t("Ajuster : image entière")}</option>
          <option value="cover">{t("Remplir : recadrer au centre")}</option>
          <option value="fill">{t("Étirer dans le cadre")}</option>
        </select>
      </label>
      <div className="property-row">
        <NumberField
          label="X"
          value={Math.round(mark.x * 10) / 10}
          min={0}
          onChange={(x) => updateMark({ x })}
        />
        <NumberField
          label="Y"
          value={Math.round(mark.y * 10) / 10}
          min={0}
          onChange={(y) => updateMark({ y })}
        />
      </div>
      {mark.naturalWidth && mark.naturalHeight && (
        <Button
          variant="secondary"
          onClick={() =>
            updateMark({
              width: mark.width,
              height: (mark.width * mark.naturalHeight!) / mark.naturalWidth!,
              lockAspectRatio: true,
              imageFit: "contain",
            })
          }
        >
          {t("Rétablir le format d’origine")}
        </Button>
      )}
      <Button variant="danger" onClick={deleteSelected}>
        <Trash2 size={15} />
        {t("Supprimer l’image")}
      </Button>
    </section>
  );
}
