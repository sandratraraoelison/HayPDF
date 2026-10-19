import type { FormValue } from "../domain/formField";
import type {
  OfficeExportFormat,
  RecognitionLanguage,
} from "../domain/conversion";

export type DocumentTool =
  | "create"
  | "export"
  | "split"
  | "compress"
  | "protect"
  | "form-data"
  | "office";
export interface DocumentToolOptions {
  format: "pdf" | "png" | "jpeg" | "text" | OfficeExportFormat;
  recognition?: RecognitionLanguage;
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
  export: "Convertir et exporter",
  split: "Diviser un PDF",
  compress: "Compresser un PDF",
  protect: "Protéger un PDF",
  "form-data": "Remplir un formulaire",
  office: "Document bureautique vers PDF",
};
