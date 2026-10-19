# HayPDF

Éditeur PDF de bureau local, en français et en anglais, avec Electron, React et TypeScript strict.

## Démarrer

Node.js 22.12+ et npm sont requis.

```sh
npm install
npm run dev
```

`npm run dev:web` lance la version navigateur, `npm run build` compile l'interface, `npm start` ouvre Electron après compilation et `npm run pack` prépare l'application dans `release/`.

## Fonctionnalités

- Conversion PDF vers Word DOCX, Excel XLSX, PowerPoint PPTX et RTF, entièrement locale. DOCX/RTF : récupération du texte modifiable sans reconstruction des images et de la mise en page complexe. XLSX : une feuille par page et cellules séparées par tabulations/espaces multiples, sans détection sémantique des tableaux. PPTX : une image de page par diapositive, sans texte éditable. OCR français, anglais ou bilingue en option pour les pages sans texte recherchable ; une relecture est nécessaire.
- Logo HayPDF : document, initiale H et crayon, utilisé dans l’interface, le favicon et l’icône Windows. Cliquez sur la marque dans l’en-tête pour ouvrir « À propos » : version issue de `package.json`, résumé des fonctions, prérequis, contact et copyright de Sandratra RAOELISON.
- Atelier de versions : enregistrer des étapes nommées, comparer la page courante avec le rendu PDF actuel (avant/après et différences en rouge), puis restaurer une étape avec annulation possible. Versions locales en mémoire, limitées à la session du document et effacées à l’ouverture d’un autre document ou à la fermeture de l’application.
- Interface contextuelle : propriétés selon la sélection, organisation dans l’onglet Pages, catalogue avec recherche sans accents, thèmes clair/sombre et navigation au clavier.
- Ouverture par sélection de fichier ou glisser-déposer, rendu PDF.js et miniatures.
- Ajout de texte avec police, taille et couleur ; surlignage, rectangles, images PNG/JPEG, signature textuelle et tampon.
- Sélection, déplacement, dimensions et suppression des éléments ajoutés.
- Images : insertion aux proportions naturelles, déplacement en direct, huit poignées de redimensionnement, verrouillage des proportions (Maj inverse temporairement ce verrouillage), dimensions et position numériques. Modes Ajuster, Remplir en recadrant au centre et Étirer, reproduits lors de l'export, y compris sur les pages pivotées. Un glissement produit une seule entrée dans l'historique.
- Fusion de PDF, réorganisation, suppression, rotation et extraction d'une page.
- Catalogue « Tous les outils » : création de PDF vierges ou depuis des images PNG/JPEG ordonnées, export PDF/PNG/JPEG/texte, duplication et division en fichiers PDF regroupés dans un ZIP.
- Compression locale sans perte, protection AES-256 par mot de passe et ouverture des PDF protégés après saisie du mot de passe.
- Formulaires AcroForm : champs texte, cases à cocher, listes déroulantes, groupes radio et listes à choix multiples ; saisie des réponses dans l'éditeur, export JSON et copie PDF non interactive.
- Conversion de documents DOC/DOCX/ODT, XLS/XLSX/ODS, PPT/PPTX/ODP et RTF vers PDF avec LibreOffice installé, uniquement dans Electron.
- Historique annuler/rétablir ; export d'une copie PDF avec les éléments incorporés.
- Aucun transfert de document sur un serveur.
- Les consignes de placement disparaissent une fois l'action effectuée ; les confirmations de succès disparaissent après quatre secondes. Les erreurs restent consultables jusqu'à leur fermeture ou à une nouvelle opération.
- Mode sombre et mode clair, langue français/anglais, préférences mémorisées localement.
- Remplacement du texte natif : choisir « Texte natif », sélectionner un bloc, saisir le remplacement et appliquer. MuPDF supprime le texte ciblé avant l'insertion du nouveau texte.
- OCR local français + anglais sur la page courante : bouton OCR, correction des lignes dans « Texte reconnu », puis export du PDF recherchable. Les modèles de reconnaissance sont embarqués.

## Raccourcis clavier

La touche **Ctrl** est remplacée par **⌘** sur macOS. La liste est accessible avec **F1**, **?** ou le bouton clavier dans l'en-tête.

| Combinaison                           | Action                                           |
| ------------------------------------- | ------------------------------------------------ |
| Ctrl + O / Ctrl + S                   | Ouvrir / exporter un PDF                         |
| Ctrl + Z / Ctrl + Y ou Ctrl + Maj + Z | Annuler / rétablir                               |
| Ctrl + + / Ctrl + −                   | Zoomer / dézoomer de 10 points de pourcentage    |
| Ctrl + molette                        | Zoomer sur l'espace document                     |
| Ctrl + 0                              | Afficher à 100 %                                 |
| Ctrl + 1 / Ctrl + 2                   | Ajuster à la largeur / à la page                 |
| Page précédente / Page suivante       | Naviguer entre les pages                         |
| Début / Fin                           | Première / dernière page                         |
| Suppr ou Retour arrière               | Supprimer uniquement l'élément sélectionné       |
| Flèches / Maj + flèches               | Déplacer l'élément sélectionné de 1 / 10 points  |
| V / T / H / R                         | Sélection / texte / surligneur / rectangle       |
| Échap                                 | Quitter l'outil, fermer l'aide ou désélectionner |

Le zoom du document est limité à 25–300 %, sans agrandir les panneaux de l'interface. Les raccourcis de saisie, copie, collage et annulation natifs restent disponibles dans les champs. Pendant un traitement, les commandes qui modifient le document sont bloquées.

## Architecture

L'interface est composée de composants spécialisés ; `App.tsx` assemble uniquement la session et les zones de travail.

| Emplacement                                                  | Responsabilité                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `presentation/components/`                                   | En-tête, barre d'outils, pages, propriétés, OCR, édition native et contrôles de vue        |
| `presentation/ui/`                                           | Primitives réutilisables `Button` et `NumberField`, indépendantes du contexte de l'éditeur |
| `presentation/EditorContext.tsx`                             | Session partagée, typée et limitée au fournisseur `EditorProvider`                         |
| `presentation/hooks/useEditorController.ts`                  | Coordination des commandes, de la sélection, des fichiers et de l'historique               |
| `presentation/hooks/useEditorZoom.ts`                        | Échelle, ajustement à la vue et zoom à la molette                                          |
| `presentation/hooks/useEditorShortcuts.ts`                   | Association des raccourcis aux commandes de l'éditeur                                      |
| `presentation/hooks/usePdfPage.ts`                           | Cycle de vie du rendu PDF.js et extraction des blocs sélectionnables                       |
| `presentation/PdfCanvas.tsx` et `components/MarkOverlay.tsx` | Affichage PDF et éléments ajoutés, utilisables par props sans contexte de session          |

Les panneaux appellent des commandes (`moveMark`, `updateOcrText`, `selectPage`, etc.) ; ils ne manipulent pas directement les snapshots du document. Les règles pour les prochaines contributions sont dans `AGENTS.md`. TypeScript refuse désormais les déclarations et paramètres inutilisés.

`src/domain` définit les modèles sans dépendance UI ; `src/application` gère l'historique, le remplacement natif, les traductions et les préférences ; `src/infrastructure` adapte pdf-lib, PDF.js, MuPDF, Tesseract et la sauvegarde ; `src/presentation` contient les composants et les styles. Electron utilise un preload limité à la sauvegarde via une boîte de dialogue système, avec isolation du contexte, sandbox et Node désactivé dans le renderer. Les couleurs de l'interface sont définies par des variables CSS ; les pages PDF conservent leurs couleurs réelles dans les deux thèmes.

Les modifications sont des modèles immuables. Les octets sources restent intacts dans l'historique. Un remplacement natif consolide les modifications dans une nouvelle source, annulable. La sauvegarde produit une nouvelle copie. Les documents chiffrés ne sont pas pris en charge. Les annotations exportées sont aplaties. `scripts/prepare-assets.cjs`, exécuté automatiquement avant le développement et la compilation, copie le worker, les binaires et les modèles OCR depuis les dépendances dans `public/ocr` ; aucun CDN n'est utilisé à l'exécution.

## Limites explicites

Le remplacement natif fonctionne sur les segments horizontaux extractibles, séparés selon leur style. Par défaut, le moteur réintègre le programme de police d'origine, ses glyphes et sa matrice de texte ; il conserve les positions des caractères du préfixe inchangé. Le panneau affiche le nom de la police d'origine. La compression automatique a été supprimée : si le texte dépasse la largeur disponible, le remplacement est refusé avec un message invitant à raccourcir le texte ou à réduire explicitement sa taille. Si la police intégrée ne contient pas un caractère nécessaire ou ne peut pas être réutilisée, le remplacement échoue sans modifier le document. Changer explicitement la famille dans les propriétés sélectionne une police standard de substitution.

Pour les sous-ensembles Noto Serif, l'application embarque les polices complètes Regular, Bold, Italic et BoldItalic sous licence SIL OFL 1.1. Les caractères manquants sont fournis localement par la variante correspondante, tandis que les caractères disponibles conservent la police du PDF. Aucun téléchargement n'a lieu pendant l'édition. Une version différente de la police complète peut présenter de légères différences sur les nouveaux caractères : contrôler visuellement le résultat. La largeur disponible tient compte du prochain segment sur la même ligne et du bord de la page, afin de permettre une extension dans l'espace libre sans compression ni recouvrement du texte suivant.

Les erreurs affichent un diagnostic sélectionnable avec code, nom de police, caractères Unicode manquants, pile technique et causes disponibles. Le bouton « Charger une police TTF/OTF » permet de sélectionner un fichier local complet, de 20 Mo maximum, puis de relancer le remplacement. Ce chargement s'applique à la police source concernée pendant la session ; il ne réalise pas une installation système. Installer une police dans Windows ou macOS ne la rend pas automatiquement accessible au renderer Electron : son fichier doit être chargé dans l'éditeur. Les données restent locales et une erreur n'altère pas le document courant.

Les remplacements contenant des sauts de ligne sont refusés. Valider un texte et un style inchangés conserve la source intacte. Le résultat modifié est incorporé au PDF avant le rendu, afin que l'aperçu et l'export utilisent les mêmes métriques. Une copie déjà exportée avec une ancienne police de substitution ne permet pas de retrouver sa police originale : rouvrir le fichier d'origine pour appliquer cette correction.

Le remplacement ne recompose pas automatiquement les paragraphes autour du segment. Le texte converti en tracés ne peut pas être sélectionné comme texte natif. Le texte vertical ou incliné n'est pas proposé à la sélection.

L'OCR reconnaît la page courante et ajoute une couche invisible recherchable, dont les lignes peuvent être corrigées. Il conserve l'image du scan et ne retouche pas les lettres présentes dans cette image. Il faut contrôler la reconnaissance, notamment sur les scans flous, tableaux ou écritures manuscrites. Relancer l'OCR remplace la couche OCR précédente de la page. L'OCR vise les pages scannées : l'appliquer à une page possédant déjà du texte natif peut dupliquer le texte extrait.

La signature est visuelle, sans certificat numérique. Les polices standard de l'export couvrent les caractères occidentaux ; des polices embarquées seront nécessaires pour les autres écritures. La rotation d'une page contenant des éléments ajoutés est bloquée pour conserver leur placement. Le travail est conservé en mémoire jusqu'à l'export ; quitter l'application perd les modifications non exportées. L'outil de remplacement n'est pas un outil d'assainissement complet de métadonnées ou de pièces jointes sensibles.

## Licence du moteur natif

MuPDF est distribué sous **AGPL-3.0-or-later**, avec une licence commerciale alternative proposée par Artifex. Son intégration impose de respecter les conditions applicables à la distribution de l'application. Les fichiers de licence des dépendances sont conservés dans leurs paquets ; voir https://github.com/ArtifexSoftware/mupdf.js et https://www.artifex.com/ pour les conditions du moteur.

## Vérification

Le panneau latéral propose les onglets **Modifier**, **Pages** et **Tous les outils**. Modifier regroupe les actions de pages (rotation, insertion d'une page vierge après la page actuelle, suppression, extraction), les ajouts de texte et d'image, la signature visuelle et la fusion de PDF. Tous les outils donne accès aux créations, conversions, exports, formulaires, compression et protection.

Les nouveaux outils permettent d'ajouter des en-têtes/pieds de page et un filigrane textuel sur la page actuelle ou toutes les pages. Les jetons `{page}` et `{pages}` insèrent la pagination. Les liens HTTP(S) et les champs de texte AcroForm deviennent interactifs dans un lecteur PDF après export. Leur zone se positionne dans l'aperçu ou se règle en points PDF depuis le coin supérieur gauche.

**Biffer un PDF** retire réellement le texte, les pixels des images et les tracés touchant la zone choisie, puis dessine un masque noir. Cette opération conserve les sources dans l'historique de l'éditeur pour permettre l'annulation ; le fichier exporté est reconstruit à partir du résultat. Les outils restent locaux et leurs libellés sont disponibles en français et en anglais. Les signatures existantes sont visuelles, sans certificat électronique. Aucun service IA ni nouveau service de signature électronique n'est ajouté.

Les exports d'images acceptent 72 à 300 DPI avec un côté maximal de 5 000 pixels ; plusieurs images sont regroupées dans un ZIP. Les pages s'indiquent avec `1-3,5`. Pour diviser un PDF, `1-3;4-6` produit deux fichiers, et un champ vide produit un fichier par page. La compression reste sans perte : elle n'abaisse pas la résolution des images et peut ne pas réduire un PDF déjà optimisé. La protection s'applique à une copie exportée ; le mot de passe n'est pas conservé dans les préférences. Pour les formulaires, « Remplir un formulaire » applique les réponses avec annulation possible ou exporte une copie non interactive.

La conversion bureautique nécessite une installation locale de LibreOffice à son emplacement habituel (`Program Files/LibreOffice` sous Windows, `/Applications/LibreOffice.app` sous macOS, `/usr/bin/libreoffice` ou `/usr/local/bin/libreoffice` sous Linux). L'application indique explicitement son absence. Cette conversion utilise un profil temporaire isolé, une durée maximale de deux minutes et aucun serveur. LibreOffice n'est pas installé dans l'environnement de vérification : le parcours de conversion réelle reste à valider sur un poste équipé. La conversion inverse PDF vers Word/Excel avec conservation complète de la mise en page n'est pas proposée.

```sh
npm run typecheck
npm test
npm run build
```

Les tests couvrent fusion, ordre, rotation, extraction, export des éléments, rejet des fichiers invalides, suppression effective du texte natif aux quatre rotations, conservation des textes voisins et export d'une couche OCR recherchable sans changement visuel.

Les tests de police intégrée vérifient aussi la réécriture effective de glyphes sans différence de pixels, la conservation d'une matrice de texte horizontalement mise à l'échelle et le refus d'un texte trop long. Ces tests utilisent Times New Roman sur Windows ou DejaVu Serif sur Linux et sont ignorés si aucune de ces polices n'est installée.

`scripts/smoke.cjs` vérifie aussi le chargement de l'interface dans Electron, les changements de thème et de langue, le rendu d'un PDF, le remplacement natif, l'OCR et l'ajout de texte. Il produit des captures temporaires dans `tmp/`. `npm run smoke` exécute cette recette après compilation. `npm run format` harmonise le code avec Prettier.

L'audit npm ne signale aucune vulnérabilité de production lors de la vérification initiale. L'outil de packaging electron-builder présente huit alertes modérées transitives, liées à sprintf-js, sans version corrigée disponible au moment de l'installation ; le packaging reste à valider avant distribution.

Sécurité Electron : https://www.electronjs.org/docs/latest/tutorial/security/
API PDF : https://pdf-lib.js.org/docs/api/classes/pdfdocument
