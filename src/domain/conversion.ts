export type OfficeExportFormat = "docx" | "pptx" | "xlsx" | "rtf";
export type RecognitionLanguage = "none" | "fra" | "eng" | "fra+eng";
export const officeExportFormats: readonly OfficeExportFormat[] = [
  "docx",
  "pptx",
  "xlsx",
  "rtf",
];
export function isOfficeExport(value: string): value is OfficeExportFormat {
  return officeExportFormats.includes(value as OfficeExportFormat);
}
