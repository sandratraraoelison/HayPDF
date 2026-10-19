import { NativeFontError } from "../domain/NativeFontError";
type Translate = (text: string) => string;
export interface OperationError {
  summary: string;
  details: string;
  fontRelated: boolean;
}
/** Keep the original diagnostic and cause chain; only the short summary is translated. */
export function describeOperationError(
  error: unknown,
  t: Translate,
): OperationError {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof NativeFontError ? error.code : message;
  const fontRelated =
    code === "NATIVE_FONT_UNAVAILABLE" || code === "NATIVE_FONT_MISSING_GLYPH";
  let summary: string;
  const toolErrors: Record<string, string> = {
    NO_EXTRACTABLE_TEXT:
      "Aucun texte extrait. Activez l’OCR pour les pages scannées ou choisissez un export en images.",
    CONVERSION_LIMIT:
      "Le texte dépasse les limites du format choisi. Sélectionnez moins de pages ou exportez en texte brut.",
    ARCHIVE_VALIDATION_FAILED:
      "La validation PDF/A a échoué. Consultez le rapport avant d’exporter.",
    INVALID_TAG_ORDER:
      "Ce déplacement dépasse les éléments de ce niveau de structure.",
    INVALID_REVIEW_POSITION:
      "Position de commentaire invalide : placez la note entièrement dans la page.",
    REVIEW_DOCUMENT_MISMATCH:
      "Le fichier de retours ne correspond pas au contenu de ce PDF.",
    INVALID_REVIEW: "Le fichier de retours est invalide.",
    INVALID_MEASUREMENT: "Sélectionnez les points et une échelle valide.",
    ATTACHMENT_EXISTS: "Une pièce jointe porte déjà ce nom.",
    STAMP_TOO_SMALL: "Le tampon est trop petit pour ce texte.",
    INVALID_RECIPE: "L’outil personnalisé contient une action invalide.",
    ACCESSIBILITY_METADATA_REQUIRED:
      "Renseignez le titre et la langue du document.",
    INVALID_PRINT_BOXES:
      "Les boîtes de coupe ou de fond perdu dépassent la page.",
    SCRIPT_REQUIRED: "Saisissez le nom et le code du script.",
    VERAPDF_REQUIRED:
      "Installez Java et veraPDF, puis sélectionnez le dossier veraPDF contenant bin/*.jar.",
    INVALID_PAGE_RANGE:
      "Pages invalides. Utilisez des numéros existants, par exemple 1-3,5.",
    INVALID_PASSWORD:
      "Saisissez un mot de passe non vide de 127 octets maximum, sans caractères de contrôle.",
    PASSWORD_MISMATCH: "Les mots de passe ne correspondent pas.",
    WRONG_PASSWORD: "Mot de passe incorrect. Réessayez.",
    EXPORT_TOO_LARGE:
      "L’export dépasse la limite de 250 Mo. Sélectionnez moins de pages.",
    INVALID_DPI: "La résolution doit être comprise entre 72 et 300 DPI.",
    INVALID_PAGE_SIZE:
      "Les dimensions doivent être comprises entre 72 et 2 000 points PDF.",
    NO_IMAGES: "Sélectionnez au moins une image PNG ou JPEG.",
    INVALID_IMAGE_TYPE: "Seules les images PNG et JPEG sont acceptées.",
    IMAGES_TOO_LARGE: "La limite totale des fichiers est de 100 Mo.",
    DESKTOP_REQUIRED:
      "Cette conversion nécessite l’application Electron et LibreOffice installé.",
    NO_OFFICE_FILE: "Sélectionnez un document bureautique.",
    LIBREOFFICE_NOT_FOUND:
      "LibreOffice est introuvable. Installez gratuitement LibreOffice à son emplacement habituel, puis relancez la conversion.",
    FORM_CHOICES_REQUIRED: "Ajoutez au moins un choix pour ce champ.",
    FORM_AREA_TOO_SMALL:
      "Augmentez la hauteur de la zone : au moins 12 points par bouton radio.",
    INVALID_FORM_VALUE:
      "La réponse ne correspond pas au type ou aux choix du champ.",
  };
  const toolCode = Object.keys(toolErrors).find((key) => message.includes(key));
  if (toolCode) summary = t(toolErrors[toolCode]);
  else if (message.includes("100 Mo") || message.includes("100 MB"))
    summary = message;
  else if (code === "NATIVE_TEXT_OVERFLOW")
    summary = t(
      "Le texte dépasse la largeur disponible. Raccourcissez-le ou réduisez explicitement sa taille.",
    );
  else if (fontRelated)
    summary = t(
      "La police intégrée ne permet pas ce remplacement. Le document est conservé intact.",
    );
  else if (code === "NATIVE_TEXT_SINGLE_LINE")
    summary = t("Le remplacement doit rester sur une seule ligne.");
  else if (/WinAnsi|encode/.test(message))
    summary = t(
      "Certains caractères ne sont pas pris en charge par cette police.",
    );
  else
    summary = t(
      "Impossible de traiter ce document. Vérifiez le fichier et réessayez.",
    );
  const sections: string[] = [];
  if (error instanceof NativeFontError) {
    sections.push(
      `${t("Code")} : ${error.code}`,
      `${t("Police concernée")} : ${error.fontName}`,
    );
    if (error.missingCharacters.length)
      sections.push(
        `${t("Caractères manquants")} : ${error.missingCharacters.map((c) => `${JSON.stringify(c)} (U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`).join(", ")}`,
      );
  }
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current !== undefined && !seen.has(current) && seen.size < 8) {
    seen.add(current);
    sections.push(
      current instanceof Error
        ? (current.stack ?? `${current.name}: ${current.message}`)
        : String(current),
    );
    current = current instanceof Error ? current.cause : undefined;
  }
  return { summary, details: sections.join("\n\n"), fontRelated };
}
