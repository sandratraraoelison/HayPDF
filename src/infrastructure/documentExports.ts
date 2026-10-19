import * as mupdf from "mupdf";
import { zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import type { DocumentModel } from "../domain/document";
import { exportDocument, readDocument } from "./pdfEngine";
import { splitPageGroups } from "../domain/pageSelection";

export interface ExportFile {
  name: string;
  bytes: Uint8Array;
  mime: string;
}
const limit = 250 * 1024 * 1024;
const stem = (name: string) =>
  name.replace(/\.pdf$/i, "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");
export function archiveFiles(name: string, files: ExportFile[]): ExportFile {
  if (files.reduce((size, file) => size + file.bytes.length, 0) > limit)
    throw new Error("EXPORT_TOO_LARGE");
  return {
    name,
    bytes: zipSync(
      Object.fromEntries(files.map((file) => [file.name, file.bytes])),
      { level: 0 },
    ),
    mime: "application/zip",
  };
}

export async function exportPageImages(
  doc: DocumentModel,
  indices: number[],
  format: "png" | "jpeg",
  dpi: number,
): Promise<ExportFile> {
  if (!Number.isFinite(dpi) || dpi < 72 || dpi > 300)
    throw new Error("INVALID_DPI");
  const source = mupdf.Document.openDocument(
    await exportDocument(doc),
    "application/pdf",
  );
  const files: ExportFile[] = [];
  let total = 0;
  try {
    for (const index of indices) {
      const page = source.loadPage(index);
      try {
        const bounds = page.getBounds();
        const scale = Math.min(
          dpi / 72,
          5000 / Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1]),
        );
        const pixmap = page.toPixmap(
          mupdf.Matrix.scale(scale, scale),
          mupdf.ColorSpace.DeviceRGB,
          false,
          true,
        );
        try {
          const bytes = (
            format === "png" ? pixmap.asPNG() : pixmap.asJPEG(90)
          ).slice();
          total += bytes.length;
          if (total > limit) throw new Error("EXPORT_TOO_LARGE");
          files.push({
            name: `${stem(doc.name)}-page-${index + 1}.${format === "jpeg" ? "jpg" : "png"}`,
            bytes,
            mime: `image/${format}`,
          });
        } finally {
          pixmap.destroy();
        }
      } finally {
        page.destroy();
      }
      // Keep the renderer responsive between pages.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  } finally {
    source.destroy();
  }
  if (!files.length) throw new Error("INVALID_PAGE_RANGE");
  return files.length === 1
    ? files[0]
    : archiveFiles(`${stem(doc.name)}-${format}.zip`, files);
}

export async function exportPlainText(
  doc: DocumentModel,
  indices: number[],
): Promise<ExportFile> {
  const source = mupdf.Document.openDocument(
    await exportDocument(doc),
    "application/pdf",
  );
  const texts: string[] = [];
  try {
    for (const index of indices) {
      const page = source.loadPage(index);
      try {
        const text = page.toStructuredText({});
        try {
          texts.push(text.asText());
        } finally {
          text.destroy();
        }
      } finally {
        page.destroy();
      }
    }
  } finally {
    source.destroy();
  }
  return {
    name: `${stem(doc.name)}.txt`,
    mime: "text/plain;charset=utf-8",
    bytes: new TextEncoder().encode(texts.join("\n\f\n")),
  };
}

export async function splitDocument(
  doc: DocumentModel,
  ranges: string,
): Promise<ExportFile> {
  const files: ExportFile[] = [];
  for (const [i, indices] of splitPageGroups(
    ranges,
    doc.pages.length,
  ).entries()) {
    files.push({
      name: `${stem(doc.name)}-part-${i + 1}.pdf`,
      mime: "application/pdf",
      bytes: await exportDocument(
        doc,
        indices.map((index) => doc.pages[index]),
      ),
    });
  }
  return archiveFiles(`${stem(doc.name)}-split.zip`, files);
}

export async function createBlankPdf(
  name: string,
  width: number,
  height: number,
): Promise<DocumentModel> {
  if (![width, height].every((n) => Number.isFinite(n) && n >= 72 && n <= 2000))
    throw new Error("INVALID_PAGE_SIZE");
  const pdf = await PDFDocument.create();
  pdf.addPage([width, height]);
  return readDocument(await pdf.save(), name);
}

export async function createImagesPdf(
  images: { bytes: Uint8Array; type: "png" | "jpeg" }[],
): Promise<DocumentModel> {
  if (!images.length) throw new Error("NO_IMAGES");
  if (
    images.reduce((sum, image) => sum + image.bytes.length, 0) >
    100 * 1024 * 1024
  )
    throw new Error("IMAGES_TOO_LARGE");
  const pdf = await PDFDocument.create();
  for (const { bytes, type } of images) {
    const image =
      type === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const w = image.width > image.height ? 842 : 595,
      h = image.width > image.height ? 595 : 842;
    const page = pdf.addPage([w, h]);
    const scale = Math.min((w - 48) / image.width, (h - 48) / image.height);
    page.drawImage(image, {
      x: (w - image.width * scale) / 2,
      y: (h - image.height * scale) / 2,
      width: image.width * scale,
      height: image.height * scale,
    });
  }
  return readDocument(await pdf.save(), "images.pdf");
}
