import { Upload, Replace, X } from "lucide-react";
import { Button } from "../ui/Button";
import { useEditor } from "../EditorContext";
export function NativeTextPanel() {
  const {
    nativeBlock,
    t,
    setNativeBlock,
    replacement,
    setReplacement,
    busy,
    applyNative,
    fontInput,
    replacementFontName,
  } = useEditor();
  if (!nativeBlock) return null;
  return (
    <section className="native-editor">
      <div className="section-label">{t("Modifier le texte existant")}</div>
      {nativeBlock.fontName && (
        <p>
          {t("Police d’origine")} : <strong>{nativeBlock.fontName}</strong>
        </p>
      )}
      <p>
        {t(
          "La police intégrée et les espacements d’origine sont conservés. Le texte ne sera pas comprimé automatiquement.",
        )}
      </p>
      <label>
        {t("Contenu")}
        <textarea
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          rows={4}
        />
      </label>
      <Button
        variant="secondary"
        disabled={busy}
        onClick={() => fontInput.current?.click()}
      >
        <Upload size={16} aria-hidden="true" />
        {t("Charger une police TTF/OTF")}
      </Button>
      {replacementFontName && (
        <p>
          {t("Police chargée")} : <strong>{replacementFontName}</strong>
        </p>
      )}
      <p>
        {t(
          "TTF/OTF · 20 Mo maximum. La police chargée sert aux caractères absents de la police d’origine.",
        )}
      </p>
      <Button
        variant="primary"
        disabled={busy}
        onClick={() => void applyNative()}
      >
        <Replace size={16} aria-hidden="true" />
        {t("Appliquer le remplacement")}
      </Button>
      <Button
        variant="secondary"
        disabled={busy}
        onClick={() => setNativeBlock(undefined)}
      >
        <X size={16} aria-hidden="true" />
        {t("Fermer")}
      </Button>
    </section>
  );
}
