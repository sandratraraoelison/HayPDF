/** French source strings and their English translations. Document content is never translated. */
import { workbenchTranslations } from "./workbenchTranslations";
export const translations: Record<string, string> = {
  ...workbenchTranslations,
  "Convertir et exporter": "Convert and export",
  "Convertir un PDF": "Convert a PDF",
  Convertir: "Convert",
  "Export local vers Word DOCX, Excel XLSX, PowerPoint PPTX et RTF. OCR français, anglais ou bilingue pour les pages sans texte. Word/RTF : texte ; Excel : lignes et cellules ; PowerPoint : pages en images.":
    "Local export to Word DOCX, Excel XLSX, PowerPoint PPTX and RTF. French, English or bilingual OCR for pages without text. Word/RTF: text; Excel: rows and cells; PowerPoint: image-based pages.",
  "Formats d’export disponibles": "Available export formats",
  "Microsoft Word (.docx)": "Microsoft Word (.docx)",
  "Microsoft PowerPoint (.pptx)": "Microsoft PowerPoint (.pptx)",
  "Microsoft Excel (.xlsx)": "Microsoft Excel (.xlsx)",
  "Texte enrichi (.rtf)": "Rich text (.rtf)",
  "Image PNG (.png)": "PNG image (.png)",
  "Image JPEG (.jpg)": "JPEG image (.jpg)",
  "Copie PDF avec vos modifications.": "PDF copy with your edits.",
  "Texte modifiable, avec séparation des pages. La mise en page complexe et les images ne sont pas reconstruites.":
    "Editable text, separated by page. Complex layout and images are not reconstructed.",
  "Une diapositive par page, sous forme d’image fidèle au PDF. Le texte des diapositives n’est pas modifiable.":
    "One slide per page, rendered as an image of the PDF. Slide text is not editable.",
  "Une feuille par page, une ligne par ligne de texte. Tabulations et espaces multiples séparent les cellules ; vérifiez les tableaux après conversion.":
    "One sheet per page, one row per line of text. Tabs and multiple spaces separate cells; review tables after conversion.",
  "Texte modifiable compatible avec les traitements de texte. Images et mise en page complexe non conservées.":
    "Editable text compatible with word processors. Images and complex layout are not retained.",
  "Images des pages, avec vos annotations et modifications.":
    "Page images including your annotations and edits.",
  "Texte recherchable extrait des pages sélectionnées.":
    "Searchable text extracted from selected pages.",
  "Langue du texte scanné (OCR)": "Scanned text language (OCR)",
  "Sans OCR : texte existant uniquement": "No OCR: existing text only",
  Français: "French",
  Anglais: "English",
  "Français et anglais": "French and English",
  "L’OCR s’applique aux pages sans texte recherchable. Il peut être plus lent et nécessite une relecture.":
    "OCR applies to pages without searchable text. It may take longer and requires review.",
  "Aucun texte extrait. Activez l’OCR pour les pages scannées ou choisissez un export en images.":
    "No text extracted. Enable OCR for scanned pages or choose image export.",
  "Le texte dépasse les limites du format choisi. Sélectionnez moins de pages ou exportez en texte brut.":
    "Text exceeds the chosen format limits. Select fewer pages or export plain text.",
  "À propos de HayPDF": "About HayPDF",
  "Version actuelle": "Current version",
  "Votre atelier PDF local, en français et en anglais. Modifiez, organisez et préparez vos documents depuis une seule interface.":
    "Your local PDF workspace, in French and English. Edit, organize and prepare documents in one place.",
  "Fonctions disponibles": "Available features",
  "Modifier et annoter": "Edit and annotate",
  "Remplacez le texte natif, ajoutez du texte, des images, des formes, des signatures et des tampons.":
    "Replace native text, add text, images, shapes, signatures and stamps.",
  "Organiser et exporter": "Organize and export",
  "Fusionnez, dupliquez, pivotez et divisez vos pages. Exportez en PDF, PNG, JPEG ou texte.":
    "Merge, duplicate, rotate and split pages. Export PDF, PNG, JPEG or text.",
  "Reconnaissance de texte": "Text recognition",
  "OCR local français et anglais sur la page courante, avec correction des lignes reconnues.":
    "Local French and English OCR on the current page, with correction of recognized lines.",
  "Formulaires et révision": "Forms and review",
  "Créez et remplissez des formulaires. Ajoutez des commentaires, des liens et des pièces jointes.":
    "Create and fill forms. Add comments, links and attachments.",
  "Versions et comparaison": "Versions and comparison",
  "Gardez des étapes nommées pendant la session, comparez les rendus et restaurez une version avec annulation possible.":
    "Keep named steps during the session, compare rendered pages and restore versions with undo support.",
  "Protection et confidentialité": "Protection and privacy",
  "Traitez vos fichiers sur votre appareil. Protégez une copie par mot de passe AES-256 et compressez sans perte.":
    "Process files on your device. Protect a copy with AES-256 password encryption and compress without loss.",
  "Mesures, index de recherche local, traitements guidés, prépresse, contrôles d’accessibilité et export d’archivage PDF/A-2b.":
    "Measurements, local search index, guided processing, prepress, accessibility checks and PDF/A-2b archival export.",
  "La conversion bureautique nécessite LibreOffice installé. Les contrôles PDF/A utilisent veraPDF ; l’export d’archivage produit une copie avec pages en images. Les versions nommées restent en mémoire pendant la session.":
    "Office conversion requires LibreOffice. PDF/A checks use veraPDF; archival export produces a copy with image-based pages. Named versions stay in memory during the session.",
  "Créé par": "Created by",
  Contact: "Contact",
  "Tous droits réservés.": "All rights reserved.",
  "Atelier de versions": "Version workspace",
  Versions: "Versions",
  "Cette page n’existait pas dans cette version.":
    "This page did not exist in this version.",
  Version: "Version",
  "Gardez vos étapes importantes, comparez le rendu PDF et revenez à une version en une action annulable.":
    "Keep important steps, compare the rendered PDF and restore a version with undo support.",
  "Versions locales pour ce document : elles sont effacées à l’ouverture d’un autre document ou à la fermeture de l’application.":
    "Local versions for this document: cleared when you open another document or close the app.",
  "Nom de la version": "Version name",
  "Ex. Avant correction, prêt à envoyer…":
    "E.g. Before corrections, ready to send…",
  "Garder cette étape": "Keep this step",
  "Versions enregistrées": "Saved versions",
  "Aucune version enregistrée. Gardez une étape avant votre prochaine modification.":
    "No saved versions. Keep a step before your next edit.",
  "Supprimer la version": "Delete version",
  "Page comparée": "Compared page",
  "La comparaison inclut vos annotations et les modifications du texte.":
    "Comparison includes your annotations and text edits.",
  "Comparer au document actuel": "Compare with current document",
  "Restaurer cette version": "Restore this version",
  "Aucune différence visuelle sur cette page.":
    "No visual differences on this page.",
  "de pixels différents sur cette page": "different pixels on this page",
  "Avant / après": "Before / after",
  "Version enregistrée": "Saved version",
  "Document actuel": "Current document",
  "Choisissez une version pour la comparer ou la restaurer.":
    "Choose a version to compare or restore.",
  "Version restaurée. Vous pouvez annuler cette action.":
    "Version restored. You can undo this action.",
  "Aucun document ouvert": "No document open",
  "Aucun élément sélectionné": "No element selected",
  "Ouvrez ou créez un PDF pour commencer. Les réglages apparaîtront ici selon votre sélection.":
    "Open or create a PDF to get started. Settings will appear here for your selection.",
  "Sélectionnez un élément ou choisissez un outil pour afficher ses réglages.":
    "Select an element or choose a tool to display its settings.",
  "Rechercher un outil": "Search tools",
  "Nom de l’outil…": "Tool name…",
  "Effacer la recherche": "Clear search",
  "Ouvrez un PDF pour activer les outils d’édition.":
    "Open a PDF to enable editing tools.",
  "Fichiers et export": "Files and export",
  "Modifier et organiser": "Edit and organize",
  "Aucun outil trouvé. Essayez un autre mot.":
    "No tools found. Try another word.",
  "STYLE DE LA FORME": "SHAPE STYLE",
  "Pour exporter une copie avec mot de passe, utilisez Protéger un PDF après modification.":
    "To export a password-protected copy, use Protect PDF after editing.",
  "Modifier un PDF": "Edit PDF",
  "Tous les outils": "All tools",
  "Créer un PDF": "Create PDF",
  "Exporter un PDF": "Export PDF",
  "Diviser un PDF": "Split PDF",
  "Compresser un PDF": "Compress PDF",
  "Protéger un PDF": "Protect PDF",
  "Remplir un formulaire": "Fill form",
  "Document bureautique vers PDF": "Office document to PDF",
  "Dupliquer la page": "Duplicate page",
  Dupliquer: "Duplicate",
  "Page dupliquée.": "Page duplicated.",
  "Scan et OCR": "Scan and OCR",
  "Traitement local, sans abonnement.": "Local processing, no subscription.",
  "Export terminé.": "Export complete.",
  "Compression sans perte terminée.": "Lossless compression complete.",
  octets: "bytes",
  Source: "Source",
  "Page vierge": "Blank page",
  "Images vers PDF": "Images to PDF",
  "Largeur (points PDF)": "Width (PDF points)",
  "Hauteur (points PDF)": "Height (PDF points)",
  "Images PNG/JPEG": "PNG/JPEG images",
  "Une image par page A4, sans déformation. 100 Mo maximum au total.":
    "One image per A4 page, preserving proportions. Maximum 100 MB in total.",
  "Nécessite LibreOffice installé sur cet ordinateur. Conversion locale, sans service payant.":
    "Requires LibreOffice installed on this computer. Local conversion, no paid service.",
  "Document bureautique": "Office document",
  Format: "Format",
  "Texte brut (.txt)": "Plain text (.txt)",
  "Résolution (DPI)": "Resolution (DPI)",
  "Plusieurs pages : archive ZIP. Le côté le plus long est limité à 5 000 pixels.":
    "Multiple pages: ZIP archive. The longest side is limited to 5,000 pixels.",
  "Vide : toutes les pages. Exemple : 1-3,5.":
    "Empty: all pages. Example: 1-3,5.",
  "Vide : un PDF par page. Séparez les groupes par ; (exemple : 1-3;4-6). Résultat dans une archive ZIP.":
    "Empty: one PDF per page. Separate groups with ; (example: 1-3;4-6). Output is a ZIP archive.",
  "Exporte une copie chiffrée AES-256. Le document ouvert reste modifiable.":
    "Exports an AES-256 encrypted copy. The open document remains editable.",
  "Mot de passe d’ouverture": "Opening password",
  "Confirmer le mot de passe": "Confirm password",
  "PDF protégé": "Protected PDF",
  "Ouvrir le document": "Open document",
  "Compression sans perte : conserve le texte, les images et les formulaires. Le gain dépend du document ; le fichier exporté ne sera pas plus volumineux que l’export standard.":
    "Lossless compression: preserves text, images and forms. Savings depend on the document; output will not exceed the standard export size.",
  Action: "Action",
  "Appliquer les réponses": "Apply answers",
  "Exporter les réponses en JSON": "Export answers as JSON",
  "Exporter une copie non interactive": "Export a non-interactive copy",
  "Ce document ne contient aucun champ de formulaire.":
    "This document contains no form fields.",
  "Aucune sélection": "No selection",
  "Type de champ": "Field type",
  "Champ de texte": "Text field",
  "Case à cocher": "Checkbox",
  "Liste déroulante": "Dropdown",
  "Groupe de boutons radio": "Radio button group",
  "Liste à choix multiples": "Multiple selection list",
  "Nom du champ": "Field name",
  "Généré automatiquement si vide": "Generated automatically if empty",
  "Choix (un par ligne)": "Choices (one per line)",
  "Cochée par défaut": "Checked by default",
  "Champ obligatoire": "Required field",
  "Ajoute un champ interactif. Utilisez Remplir un formulaire pour saisir les réponses dans l’éditeur.":
    "Adds an interactive field. Use Fill form to enter answers in the editor.",
  "Pages invalides. Utilisez des numéros existants, par exemple 1-3,5.":
    "Invalid pages. Use existing page numbers, for example 1-3,5.",
  "Saisissez un mot de passe non vide de 127 octets maximum, sans caractères de contrôle.":
    "Enter a non-empty password up to 127 bytes, without control characters.",
  "Les mots de passe ne correspondent pas.": "Passwords do not match.",
  "Mot de passe incorrect. Réessayez.": "Incorrect password. Try again.",
  "L’export dépasse la limite de 250 Mo. Sélectionnez moins de pages.":
    "Export exceeds 250 MB. Select fewer pages.",
  "La résolution doit être comprise entre 72 et 300 DPI.":
    "Resolution must be between 72 and 300 DPI.",
  "Les dimensions doivent être comprises entre 72 et 2 000 points PDF.":
    "Dimensions must be between 72 and 2,000 PDF points.",
  "Sélectionnez au moins une image PNG ou JPEG.":
    "Select at least one PNG or JPEG image.",
  "Seules les images PNG et JPEG sont acceptées.":
    "Only PNG and JPEG images are accepted.",
  "La limite totale des fichiers est de 100 Mo.":
    "The total file limit is 100 MB.",
  "Cette conversion nécessite l’application Electron et LibreOffice installé.":
    "This conversion requires the Electron application and an installed LibreOffice.",
  "Sélectionnez un document bureautique.": "Select an Office document.",
  "LibreOffice est introuvable. Installez gratuitement LibreOffice à son emplacement habituel, puis relancez la conversion.":
    "LibreOffice was not found. Install LibreOffice for free in its usual location, then retry the conversion.",
  "Ajoutez au moins un choix pour ce champ.":
    "Add at least one choice for this field.",
  "Augmentez la hauteur de la zone : au moins 12 points par bouton radio.":
    "Increase the area height: at least 12 points per radio button.",
  "La réponse ne correspond pas au type ou aux choix du champ.":
    "The answer does not match the field type or choices.",
  "Aperçu de la zone": "Area preview",
  "Cliquez sur l’aperçu pour positionner la zone.":
    "Click the preview to position the area.",
  Modifier: "Edit",
  "Panneau latéral": "Sidebar",
  "Modifier la page": "Edit page",
  "Insérer une page vierge": "Insert blank page",
  "Supprimer la page": "Delete page",
  "Extraire la page": "Extract page",
  "Organiser les pages": "Organize pages",
  "Ajouter un contenu": "Add content",
  "En-tête et pied de page": "Header and footer",
  Filigrane: "Watermark",
  Lien: "Link",
  "Autres options": "Other options",
  "Combiner des fichiers": "Combine files",
  "Biffer un PDF": "Redact PDF",
  "Préparer un formulaire": "Prepare a form",
  "Modification appliquée.": "Changes applied.",
  "La page vierge sera insérée après la page actuelle.":
    "The blank page will be inserted after the current page.",
  "Adresse du lien": "Link address",
  "Pied de page": "Footer",
  "Toutes les pages": "All pages",
  "{page} : numéro de page · {pages} : nombre de pages":
    "{page}: page number · {pages}: page count",
  "Zone en points PDF, depuis le coin supérieur gauche de la page actuelle.":
    "Area in PDF points, from the current page's top-left corner.",
  "Le texte, les pixels des images et les tracés touchés seront retirés de cette zone. Annulation disponible avant fermeture du document.":
    "Text, image pixels and touched paths will be removed from this area. Undo is available until the document is closed.",
  "Ajoute un champ de texte interactif, remplissable dans un lecteur PDF après export.":
    "Adds an interactive text field, fillable in a PDF reader after export.",
  "Traitement…": "Processing…",
  Appliquer: "Apply",
  "IMAGE SÉLECTIONNÉE": "SELECTED IMAGE",
  "Conserver les proportions": "Lock aspect ratio",
  "Mode d’affichage": "Display mode",
  "Ajuster : image entière": "Fit: entire image",
  "Remplir : recadrer au centre": "Fill: crop to center",
  "Étirer dans le cadre": "Stretch to frame",
  "Rétablir le format d’origine": "Restore original aspect ratio",
  "Supprimer l’image": "Delete image",
  "Redimensionner l’image": "Resize image",
  "Déplacez l’image ou tirez ses poignées. Maj inverse temporairement le verrouillage des proportions.":
    "Move the image or drag its handles. Shift temporarily reverses the aspect ratio lock.",
  "TTF/OTF · 20 Mo maximum. La police chargée sert aux caractères absents de la police d’origine.":
    "TTF/OTF · Maximum 20 MB. The loaded font supplies characters missing from the original font.",
  Code: "Code",
  "Police concernée": "Affected font",
  "Caractères manquants": "Missing characters",
  "Détails complets de l’erreur": "Full error details",
  "Charger une police TTF/OTF": "Load a TTF/OTF font",
  "Police chargée": "Loaded font",
  "Police chargée. Relancez le remplacement.":
    "Font loaded. Retry the replacement.",
  "Chargez le fichier TTF/OTF complet de la police indiquée, puis relancez le remplacement. Une police installée sur le système doit aussi être chargée ici.":
    "Load the complete TTF/OTF file for the indicated font, then retry. A font installed on your system must also be loaded here.",
  "Police d’origine": "Original font",
  "Le texte dépasse la largeur disponible. Raccourcissez-le ou réduisez explicitement sa taille.":
    "The text exceeds the available width. Shorten it or explicitly reduce its size.",
  "La police intégrée ne permet pas ce remplacement. Le document est conservé intact.":
    "The embedded font cannot render this replacement. The document is left unchanged.",
  "La police intégrée et les espacements d’origine sont conservés. Le texte ne sera pas comprimé automatiquement.":
    "The embedded font and original spacing are preserved. Text will not be compressed automatically.",
  "Le remplacement doit rester sur une seule ligne.":
    "The replacement must stay on a single line.",
  "La ligne de base, la famille, la graisse et la couleur détectées sont reprises. Le texte long est ajusté à la largeur du bloc.":
    "The detected baseline, font family, weight and color are preserved. Longer text is fitted to the block width.",
  "Raccourcis clavier": "Keyboard shortcuts",
  "Dans les champs, les raccourcis de saisie habituels restent actifs.":
    "Standard text editing shortcuts remain active inside input fields.",
  "Zoom avant / arrière": "Zoom in / out",
  "Zoom à la molette": "Mouse wheel zoom",
  "Taille réelle (100 %)": "Actual size (100%)",
  "Ajuster à la largeur": "Fit width",
  "Ajuster à la page": "Fit page",
  Page: "Page",
  "Page précédente / suivante": "Previous / next page",
  "Première / dernière page": "First / last page",
  "Supprimer l’élément sélectionné": "Delete selected element",
  "Déplacer l’élément (1 pt)": "Move element (1 pt)",
  "Déplacer l’élément (10 pt)": "Move element (10 pt)",
  "Sélection / Texte / Surligner / Forme": "Select / Text / Highlight / Shape",
  "Quitter l’outil / désélectionner": "Exit tool / deselect",
  "Ctrl + Maj + Z": "Ctrl + Shift + Z",
  "Ctrl + Y / Ctrl + Maj + Z": "Ctrl + Y / Ctrl + Shift + Z",
  "Ctrl + molette": "Ctrl + wheel",
  "Page ↑ / Page ↓": "Page Up / Page Down",
  "Début / Fin": "Home / End",
  "Suppr / Retour arrière": "Delete / Backspace",
  "Maj + ← ↑ → ↓": "Shift + ← ↑ → ↓",
  Échap: "Esc",
  Sélection: "Select",
  Texte: "Text",
  Surligner: "Highlight",
  Forme: "Shape",
  Tampon: "Stamp",
  "Votre texte": "Your text",
  "Votre signature": "Your signature",
  APPROUVÉ: "APPROVED",
  "Une erreur est survenue.": "An error occurred.",
  "La limite par fichier est de 100 Mo.": "The file size limit is 100 MB.",
  "Pour pivoter cette page, retirez ses éléments ajoutés ou annulez leur ajout.":
    "Remove or undo the added elements before rotating this page.",
  "Votre PDF a été exporté avec succès.": "Your PDF was exported successfully.",
  "Cliquez sur la page pour placer votre image.":
    "Click the page to place your image.",
  "ATELIER PDF": "PDF STUDIO",
  "Votre prochain document commence ici": "Your next document starts here",
  "Ouvrir un PDF": "Open PDF",
  "Exporter le PDF": "Export PDF",
  Annuler: "Undo",
  Rétablir: "Redo",
  "Vos fichiers restent sur votre appareil": "Your files stay on your device",
  "Fusionner un PDF": "Merge a PDF",
  "Les pages de votre": "Your document pages",
  "document apparaîtront ici": "will appear here",
  "Ajouter un PDF": "Add a PDF",
  "Sélectionnez et déplacez vos éléments": "Select and move your elements",
  "Cliquez sur la page pour ajouter un élément":
    "Click the page to add an element",
  "VOTRE ESPACE DE TRAVAIL, EN TOUTE SIMPLICITÉ": "YOUR WORKSPACE, SIMPLY",
  "Vos PDF.": "Your PDFs.",
  "À votre façon.": "Your way.",
  "Une idée à annoter, un document à assembler.":
    "An idea to annotate, a document to assemble.",
  "Retrouvez l’essentiel pour donner forme à vos PDF.":
    "Everything you need to shape your PDFs.",
  "Glissez votre PDF ici": "Drop your PDF here",
  "ou choisissez un fichier sur votre appareil":
    "or choose a file from your device",
  "Ouvrir un document": "Open a document",
  "PDF jusqu’à 100 Mo · Traitement 100 % local":
    "PDF up to 100 MB · 100% local processing",
  "Ajoutez du texte": "Add text",
  "Annotez librement": "Annotate freely",
  "Organisez vos pages": "Organize your pages",
  "Prêt à créer": "Ready to create",
  "Page précédente": "Previous page",
  "Page suivante": "Next page",
  Réduire: "Zoom out",
  Agrandir: "Zoom in",
  Propriétés: "Properties",
  ÉDITION: "EDIT",
  "ÉLÉMENT SÉLECTIONNÉ": "SELECTED ELEMENT",
  "STYLE DU TEXTE": "TEXT STYLE",
  Police: "Font",
  Taille: "Size",
  Couleur: "Color",
  Contenu: "Content",
  Largeur: "Width",
  Hauteur: "Height",
  "Supprimer l’élément": "Delete element",
  "ORGANISER LA PAGE": "ORGANIZE PAGE",
  Pivoter: "Rotate",
  Extraire: "Extract",
  Monter: "Move up",
  Descendre: "Move down",
  "UN PETIT CONSEIL": "A SMALL TIP",
  "Ajoutez un élément, puis sélectionnez-le pour ajuster son style et sa position.":
    "Add an element, then select it to adjust its style and position.",
  "Votre confidentialité compte.": "Your privacy matters.",
  "Aucun fichier envoyé en ligne.": "No files uploaded.",
  "Impossible de rendre cette page.": "This page could not be rendered.",
  "Image ajoutée": "Added image",
  "Passer au mode clair": "Switch to light mode",
  "Passer au mode sombre": "Switch to dark mode",
  "Langue de l’interface": "Interface language",
  "Texte natif": "Native text",
  "Modifier le texte existant": "Edit existing text",
  "Cliquez sur un bloc de texte du PDF.": "Click a text block in the PDF.",
  "Appliquer le remplacement": "Apply replacement",
  "Remplacement effectué.": "Text replaced.",
  Fermer: "Close",
  "Le texte original est supprimé. La police de remplacement peut différer.":
    "The original text is removed. The replacement font may differ.",
  "Reconnaître la page": "Recognize page",
  "Reconnaissance en cours…": "Recognizing text…",
  "Texte reconnu": "Recognized text",
  "Aucun texte reconnu sur cette page.": "No text recognized on this page.",
  "Le texte reconnu est ajouté comme couche recherchable invisible. Corrigez les résultats avant l’export.":
    "Recognized text is added as an invisible searchable layer. Correct the results before exporting.",
  "Impossible de traiter ce document. Vérifiez le fichier et réessayez.":
    "Unable to process this document. Check the file and try again.",
  "Cette zone ne contient plus de texte.": "This area no longer contains text.",
  "Certains caractères ne sont pas pris en charge par cette police.":
    "Some characters are not supported by this font.",
  "OCR terminé. Vous pouvez corriger les lignes reconnues.":
    "OCR complete. You can correct the recognized lines.",
};
