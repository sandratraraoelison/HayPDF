import * as mupdf from "mupdf";
import type { DocumentModel } from "../domain/document";
import { exportDocument, readDocument } from "./pdfEngine";
export async function mutatePdf(
  doc: DocumentModel,
  action: (pdf: mupdf.PDFDocument) => void,
): Promise<DocumentModel> {
  const pdf = mupdf.Document.openDocument(
    await exportDocument(doc),
    "application/pdf",
  ).asPDF();
  if (!pdf) throw new Error("Invalid PDF");
  try {
    action(pdf);
    const buffer = pdf.saveToBuffer("garbage=4,compress");
    try {
      return await readDocument(buffer.asUint8Array().slice(), doc.name);
    } finally {
      buffer.destroy();
    }
  } finally {
    pdf.destroy();
  }
}
export function withPdfPage<T>(
  pdf: mupdf.PDFDocument,
  index: number,
  action: (page: mupdf.PDFPage) => T,
): T {
  const page = pdf.loadPage(index);
  try {
    if (!(page instanceof mupdf.PDFPage)) throw new Error("Invalid PDF page");
    return action(page);
  } finally {
    page.destroy();
  }
}
