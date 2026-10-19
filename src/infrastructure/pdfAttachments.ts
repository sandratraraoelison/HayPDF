import * as mupdf from "mupdf";
import type { DocumentModel } from "../domain/document";
import { exportDocument } from "./pdfEngine";
import { mutatePdf, withPdfPage } from "./pdfMutation";
export interface EmbeddedFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}
export async function listAttachments(
  doc: DocumentModel,
): Promise<EmbeddedFile[]> {
  const pdf = mupdf.Document.openDocument(
    await exportDocument(doc),
    "application/pdf",
  ).asPDF()!;
  try {
    return Object.entries(pdf.getEmbeddedFiles()).map(([name, ref]) => {
      const params = pdf.getFilespecParams(ref),
        buffer = pdf.getEmbeddedFileContents(ref);
      try {
        return {
          name,
          type: params.mimetype || "application/octet-stream",
          bytes: buffer?.asUint8Array().slice() ?? new Uint8Array(),
        };
      } finally {
        buffer?.destroy();
      }
    });
  } finally {
    pdf.destroy();
  }
}
export async function attachFile(
  doc: DocumentModel,
  index: number,
  file: EmbeddedFile,
): Promise<DocumentModel> {
  return mutatePdf(doc, (pdf) => {
    if (pdf.getEmbeddedFiles()[file.name]) throw new Error("ATTACHMENT_EXISTS");
    const ref = pdf.addEmbeddedFile(
      file.name,
      file.type,
      file.bytes,
      new Date(),
      new Date(),
      true,
    );
    pdf.insertEmbeddedFile(file.name, ref);
    withPdfPage(pdf, index, (page) => {
      const annotation = page.createAnnotation("FileAttachment");
      try {
        annotation.setFileSpec(ref);
        annotation.setRect([30, 30, 52, 52]);
        annotation.setContents(file.name);
        annotation.setIcon("Paperclip");
        annotation.update();
      } finally {
        annotation.destroy();
      }
    });
  });
}
export async function removeAttachment(
  doc: DocumentModel,
  name: string,
): Promise<DocumentModel> {
  return mutatePdf(doc, (pdf) => {
    const ref = pdf.getEmbeddedFiles()[name];
    if (!ref) return;
    for (let i = 0; i < pdf.countPages(); i++)
      withPdfPage(pdf, i, (page) => {
        const annotations = page.getAnnotations();
        try {
          for (const a of annotations)
            if (
              a.getType() === "FileAttachment" &&
              a.getFileSpec().asIndirect() === ref.asIndirect()
            )
              page.deleteAnnotation(a);
        } finally {
          annotations.forEach((a) => a.destroy());
        }
      });
    pdf.deleteEmbeddedFile(name);
  });
}
