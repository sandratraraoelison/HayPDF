/** Keep this catalog and its translations current whenever features change. */
export const appFeatures = [
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
    icon: "Files",
    title: "Menu Fichier",
    summary:
      "Le bouton en haut à gauche permet de créer un document, ouvrir un PDF local, exporter le PDF courant et consulter les raccourcis. Le nouveau document utilise les options de création existantes ; aucun format de projet séparé n’est enregistré.",
  },
  {
    icon: "FilePenLine",
    title: "Options de l’élément cliqué",
    summary:
      "En mode Sélection, cliquez sur un texte ou une image intégrés, ou sur un élément ajouté, pour afficher ses options dans Propriétés. Un clic sur le fond vide efface la sélection. Les dessins vectoriels d’origine et le texte des pages scannées ne sont pas sélectionnables individuellement.",
  },
  {
    icon: "FilePenLine",
    title: "Pointeur de précision",
    summary:
      "Un pointeur en croix à double contraste indique précisément la position sur la page, y compris pendant le tracé libre. Les éléments déplaçables et les poignées conservent leurs curseurs dédiés.",
  },
  {
    icon: "FilePenLine",
    title: "Formes géométriques",
    summary:
      "Choisissez une forme dans le menu du bouton Forme : 11 formes prédéfinies et un tracé libre à la souris ou au stylet. Couleur, dimensions, déplacement, annulation et export PDF. Échap annule le trait en cours. Traits sans remplissage ni rotation individuelle ; pression du stylet non prise en compte.",
  },
  {
    icon: "Wrench",
    title: "Catalogue des outils",
    summary:
      "Recherchez un outil avec un champ fixe au-dessus de la liste défilante. Les outils nécessitant un document restent désactivés tant qu’aucun PDF n’est ouvert.",
  },
  {
    icon: "FilePenLine",
    title: "Supprimer les images intégrées",
    summary:
      "Détectez et supprimez les images matricielles de la page, avec annulation. Les images superposées sont exclues. Une page scannée peut constituer une seule image ; les dessins vectoriels ne sont pas concernés.",
  },
  {
    icon: "Wrench",
    title: "Démarrage Electron",
    summary:
      "Un écran avec logo et indicateur animé, sans texte, accompagne le démarrage jusqu’au premier affichage de l’éditeur. Disponible uniquement dans l’application de bureau Electron.",
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
      "Remplacez le texte natif, ajoutez du texte, des images, des formes, des signatures et des tampons.",
  },
  {
    icon: "Files",
    title: "Organiser et exporter",
    summary:
      "Fusionnez, dupliquez, pivotez et divisez vos pages. Exportez en PDF, PNG, JPEG ou texte.",
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
