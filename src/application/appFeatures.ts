/** Keep this catalog and its translations current whenever features change. */
export const appFeatures = [
  {
    icon: "Info",
    title: "Informations sur HayPDF",
    summary:
      "Le bouton À propos, à côté du logo, présente les fonctions, leurs limites, la version et le contact de l’auteur. Accessible sans document ouvert.",
  },
  {
    icon: "Files",
    title: "Détection des images et illustrations",
    summary:
      "Repérez les images matricielles visibles, y compris dans les objets imbriqués, avec leurs dimensions en pixels, leur rotation et leur recadrage. Les groupes de formes colorées superposées peuvent être proposés comme zones vectorielles à aplatir. Détection vectorielle indicative et contours de masques courbes approximatifs ; sélection manuelle disponible. La suppression isolée reste bloquée quand les images risquent d’interférer.",
  },
  {
    icon: "FilePenLine",
    title: "Modifier les images et illustrations",
    summary:
      "Déplacez, redimensionnez, remplacez, tournez ou retournez les images ajoutées ; réglez leur opacité et leur cadrage. Rendez une image intégrée ou une zone vectorielle modifiable par aplatissement en PNG : textes et formes inclus perdent leur sélection individuelle. Jusqu’à 216 ppp, 4 096 pixels par côté ; zones avec annotations, formulaires ou texte coupé exclues. Remplacement PNG/JPEG limité à 20 Mo. Annulation disponible.",
  },
  {
    icon: "FilePenLine",
    title: "Reconstituer un graphique",
    summary:
      "Remplacez une zone par un histogramme, un camembert ou un diagramme de processus vectoriel. Saisissez les données, les couleurs et les libellés, vérifiez l’aperçu, puis appliquez avec annulation possible. Les données d’origine ne sont pas récupérées automatiquement. Maximum : 12 éléments dans une zone d’au moins 180 × 80 points ; style uniforme, sans formules ni liens Excel, caractères pris en charge par Helvetica uniquement.",
  },
  {
    icon: "ClipboardList",
    title: "Modifier les tableaux simples",
    summary:
      "Encadrez une grille à texte sélectionnable, vérifiez les cellules, puis ajoutez ou supprimez des lignes et colonnes. Reconstruction locale dans la zone d’origine avec annulation. Style uniforme, sans formules, cellules fusionnées ni tableaux scannés. Maximum : 100 lignes et 20 colonnes, sous réserve d’espace et de caractères pris en charge par Helvetica.",
  },
  {
    icon: "FilePenLine",
    title: "Formes géométriques",
    summary:
      "Choisissez une forme dans le menu du bouton Forme : 11 formes prédéfinies et un tracé libre à la souris ou au stylet. Couleur, dimensions, déplacement, annulation et export PDF. Échap annule le trait en cours. Traits sans remplissage ni rotation individuelle ; pression du stylet non prise en compte.",
  },
  {
    icon: "FilePenLine",
    title: "Supprimer les images intégrées",
    summary:
      "Détectez et supprimez les images matricielles de la page, avec annulation. Les images superposées sont exclues. Une page scannée peut constituer une seule image ; les dessins vectoriels ne sont pas concernés.",
  },
  {
    icon: "Files",
    title: "Convertir un PDF",
    summary:
      "Export local vers Word DOCX, Excel XLSX, PowerPoint PPTX et RTF. OCR français, anglais ou bilingue pour les pages sans texte. Word/RTF : texte ; Excel : lignes et cellules ; PowerPoint : pages en images.",
  },
  {
    icon: "FilePenLine",
    title: "Modifier et annoter",
    summary:
      "Remplacez le texte natif, ajoutez du texte, des images, des formes, des signatures et des tampons. Choisir un outil efface la sélection précédente ; seuls les éléments en mode sélection peuvent être déplacés ou redimensionnés.",
  },
  {
    icon: "Files",
    title: "Organiser et exporter",
    summary:
      "Fusionnez, dupliquez, pivotez et divisez vos pages. Les miniatures permettent de changer de page, y compris en cliquant sur un élément ajouté. La rotation nécessite une page sans éléments ajoutés. Exportez en PDF, PNG, JPEG ou texte.",
  },
  {
    icon: "ScanText",
    title: "Reconnaissance de texte",
    summary:
      "OCR local français et anglais sur la page courante, avec correction des lignes reconnues.",
  },
  {
    icon: "ClipboardList",
    title: "Formulaires et révision",
    summary:
      "Créez et remplissez des formulaires. Ajoutez des commentaires, des liens et des pièces jointes.",
  },
  {
    icon: "History",
    title: "Versions et comparaison",
    summary:
      "Gardez des étapes nommées pendant la session, comparez les rendus et restaurez une version avec annulation possible.",
  },
  {
    icon: "ShieldCheck",
    title: "Protection et confidentialité",
    summary:
      "Traitez vos fichiers sur votre appareil. Protégez une copie par mot de passe AES-256 et compressez sans perte.",
  },
  {
    icon: "Wrench",
    title: "Outils avancés",
    summary:
      "Mesures, index de recherche local, traitements guidés, prépresse, contrôles d’accessibilité et export d’archivage PDF/A-2b.",
  },
] as const;
