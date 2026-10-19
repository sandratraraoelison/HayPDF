# Conventions de développement

- Construire toute interface avec des composants React à responsabilité claire. Garder `App.tsx` comme point de composition, sans logique PDF ni composants de fonctionnalité définis à l'intérieur.
- Réutiliser les primitives de `src/presentation/ui` pour les boutons et les champs numériques. Ajouter une primitive uniquement lorsqu'elle correspond à un besoin partagé réel.
- Placer les panneaux et les zones de l'éditeur dans `src/presentation/components`. Les composants liés à une session peuvent utiliser `useEditor`; les composants réutilisables indépendants, comme `PdfCanvas` et `MarkOverlay`, reçoivent des props typées.
- Garder les interactions et les effets dans des hooks ciblés sous `src/presentation/hooks`. Centraliser les mutations du document dans le contrôleur et les cas d'usage, jamais dans le JSX des panneaux.
- Conserver le domaine indépendant de React et des bibliothèques PDF. Isoler les moteurs PDF/OCR et les accès fichiers dans `src/infrastructure`.
- Ne pas modifier les sources PDF ou les snapshots d'historique en place. Conserver l'annulation/rétablissement et le traitement local des fichiers.
- Ajouter les nouveaux libellés au dictionnaire français/anglais et utiliser les variables CSS des thèmes.
- À chaque ajout ou modification d’une fonction, actualiser le catalogue `src/application/appFeatures.ts` utilisé par « À propos », ses traductions français/anglais et les limites/prérequis affichés. Ne présenter comme disponible qu’une fonction implémentée et vérifiée. Le nom de l’auteur est « Sandratra RAOELISON » ; version et contact proviennent de `package.json`.
- Après une modification structurelle : `npm run build`, `npm test`, puis `npm run smoke` pour le parcours Electron. Ne pas ajouter de tests qui ne font que recopier l'implémentation.
