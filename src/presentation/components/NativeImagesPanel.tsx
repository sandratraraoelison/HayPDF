import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";

export function NativeImagesPanel() {
  const {
    nativeImages: state,
    busy,
    t,
    chooseTool,
    imageEditing,
  } = useEditor();
  return (
    <section className="native-editor">
      <Button
        variant="secondary"
        disabled={busy}
        aria-expanded={state.enabled}
        onClick={() => {
          if (!state.enabled) chooseTool("select");
          state.setEnabled(!state.enabled);
        }}
      >
        {t("Images intégrées au PDF")}
      </Button>
      {state.enabled && (
        <>
          <p>
            {t(
              "Les images visibles et certains groupes de formes colorées sont détectés. Les illustrations vectorielles sont des zones estimées : vérifiez le cadre avant de les aplatir. Les masques courbes peuvent avoir un cadre approximatif ; la sélection manuelle reste disponible.",
            )}
          </p>
          <p>
            {t(
              "Sélectionnez une image dans la liste ou sur la page. Sur un PDF scanné, l’image peut couvrir toute la page. Les images superposées ne peuvent pas être supprimées isolément.",
            )}
          </p>
          {state.loadingImages && (
            <p role="status">{t("Détection des images…")}</p>
          )}
          {state.imageError && <p role="alert">{t(state.imageError)}</p>}
          {!state.loadingImages &&
            !state.imageError &&
            !state.images.length && (
              <p>{t("Aucune image intégrée détectée sur cette page.")}</p>
            )}
          {state.images.map((image) => (
            <Button
              key={image.index}
              variant="secondary"
              disabled={busy}
              aria-pressed={state.selectedImage === image}
              onClick={() => state.selectImage(image)}
            >
              {t(
                image.kind === "vector" ? "Illustration vectorielle" : "Image",
              )}{" "}
              {image.index + 1} ·{" "}
              {image.pixelWidth && image.pixelHeight
                ? `${image.pixelWidth} × ${image.pixelHeight} px`
                : `${Math.round(image.width)} × ${Math.round(image.height)} pt`}
            </Button>
          ))}
          {state.selectedImage && (
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => void imageEditing.selectArea(state.selectedImage!)}
            >
              {t(
                state.selectedImage.kind === "vector"
                  ? "Rendre la zone modifiable"
                  : "Rendre l’image modifiable",
              )}
            </Button>
          )}
          {state.selectedImage && state.selectedImage.kind !== "vector" && (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => void state.deleteImage()}
            >
              {t("Supprimer l’image intégrée")}
            </Button>
          )}
        </>
      )}
      <p>
        {t(
          "Pour modifier une image intégrée ou une illustration vectorielle, aplatissez sa zone en PNG. Les textes et formes inclus deviennent une seule image, jusqu’à 216 ppp et 4 096 pixels par côté. Les annotations et formulaires dans la zone sont exclus. Vous pouvez annuler.",
        )}
      </p>
      <Button
        variant="secondary"
        disabled={busy}
        onClick={() => {
          chooseTool("select");
          imageEditing.start();
        }}
      >
        {t("Modifier une illustration par zone")}
      </Button>
    </section>
  );
}
