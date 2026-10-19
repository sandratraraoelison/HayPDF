import {
  Highlighter,
  ImagePlus,
  MousePointer2,
  TextCursorInput,
  PenLine,
  Square,
  Stamp,
  Type,
} from "lucide-react";
export const tools = [
  { id: "select", label: "Sélection", icon: MousePointer2 },
  { id: "text", label: "Texte", icon: Type },
  { id: "native", label: "Texte natif", icon: TextCursorInput },
  { id: "highlight", label: "Surligner", icon: Highlighter },
  { id: "image", label: "Image", icon: ImagePlus },
  { id: "rectangle", label: "Forme", icon: Square },
  { id: "signature", label: "Signature", icon: PenLine },
  { id: "stamp", label: "Tampon", icon: Stamp },
] as const;
