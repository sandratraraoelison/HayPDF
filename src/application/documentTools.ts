import type { FormValue } from "../domain/formField";

export type DocumentTool =
  | "create"
  | "export"
  | "split"
  | "compress"
  | "protect"
  | "form-data"
  | "office";
export interface DocumentToolOptions {
  format: "pdf" | "png" | "jpeg" | "text";
  ranges: string;
  dpi: number;
  password: string;
  confirmPassword: string;
  createMode: "blank" | "images";
  width: number;
  height: number;
  files: File[];
  values: Record<string, FormValue>;
  formAction: "fill" | "json" | "flatten";
}
export const documentToolLabels: Record<DocumentTool, string> = {
  create: "Créer un PDF",
  export: "Exporter un PDF",
  split: "Diviser un PDF",
  compress: "Compresser un PDF",
  protect: "Protéger un PDF",
  "form-data": "Remplir un formulaire",
  office: "Document bureautique vers PDF",
};
