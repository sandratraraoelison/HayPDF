import type { DocumentToolOptions } from "./documentTools";

/** Shared by conversion controls and About so new output formats are listed in both. */
export const exportFormats: readonly {
  id: DocumentToolOptions["format"];
  label: string;
  description: string;
  recognition?: boolean;
}[] = [
  { id: "pdf", label: "PDF", description: "Copie PDF avec vos modifications." },
  {
    id: "docx",
    label: "Microsoft Word (.docx)",
    description:
      "Texte modifiable, avec séparation des pages. La mise en page complexe et les images ne sont pas reconstruites.",
    recognition: true,
  },
  {
    id: "pptx",
    label: "Microsoft PowerPoint (.pptx)",
    description:
      "Une diapositive par page, sous forme d’image fidèle au PDF. Le texte des diapositives n’est pas modifiable.",
  },
  {
    id: "xlsx",
    label: "Microsoft Excel (.xlsx)",
    description:
      "Une feuille par page, une ligne par ligne de texte. Tabulations et espaces multiples séparent les cellules ; vérifiez les tableaux après conversion.",
    recognition: true,
  },
  {
    id: "rtf",
    label: "Texte enrichi (.rtf)",
    description:
      "Texte modifiable compatible avec les traitements de texte. Images et mise en page complexe non conservées.",
    recognition: true,
  },
  {
    id: "png",
    label: "Image PNG (.png)",
    description: "Images des pages, avec vos annotations et modifications.",
  },
  {
    id: "jpeg",
    label: "Image JPEG (.jpg)",
    description: "Images des pages, avec vos annotations et modifications.",
  },
  {
    id: "text",
    label: "Texte brut (.txt)",
    description: "Texte recherchable extrait des pages sélectionnées.",
  },
];
