import * as mupdf from "mupdf";
import type { DocumentModel } from "../domain/document";
import type {
  OfficeExportFormat,
  RecognitionLanguage,
} from "../domain/conversion";
import { exportDocument } from "./pdfEngine";
import type { ExportFile } from "./documentExports";

interface ExportPage {
  index: number;
  width: number;
  height: number;
  text: string;
  image?: Uint8Array;
}
const limit = 250 * 1024 * 1024;
const base64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192)
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(binary);
};
/** RTF uses signed UTF-16 code units, including both halves of a surrogate pair. */
export function rtfText(text: string): string {
  let result = "";
  for (let index = 0; index < text.length; index++) {
    const char = text[index],
      code = text.charCodeAt(index);
    if (char === "\\" || char === "{" || char === "}") result += "\\" + char;
    else if (char === "\n") result += "\\par\n";
    else if (char === "\t") result += "\\tab ";
    else if (code >= 32 && code < 127) result += char;
    else if (code > 127) result += `\\u${code > 32767 ? code - 65536 : code}?`;
  }
  return result;
}

export async function exportOfficeDocument(
  doc: DocumentModel,
  indices: number[],
  format: OfficeExportFormat,
  recognition: RecognitionLanguage = "none",
): Promise<ExportFile> {
  if (
    !indices.length ||
    indices.some(
      (index) =>
        !Number.isInteger(index) || index < 0 || index >= doc.pages.length,
    )
  )
    throw new Error("INVALID_PAGE_RANGE");
  const source = mupdf.Document.openDocument(
    await exportDocument(doc),
    "application/pdf",
  );
  const pages: ExportPage[] = [];
  let imageBytes = 0;
  try {
    for (const index of indices) {
      const page = source.loadPage(index);
      try {
        const bounds = page.getBounds(),
          text = page.toStructuredText({});
        let content: string;
        try {
          content = text.asText();
        } finally {
          text.destroy();
        }
        const result: ExportPage = {
          index,
          width: bounds[2] - bounds[0],
          height: bounds[3] - bounds[1],
          text: content,
        };
        if (format === "pptx") {
          const scale = Math.min(
            2,
            2500 / Math.max(result.width, result.height),
          );
          const image = page.toPixmap(
            mupdf.Matrix.scale(scale, scale),
            mupdf.ColorSpace.DeviceRGB,
            false,
            true,
          );
          try {
            result.image = image.asPNG().slice();
            imageBytes += result.image.length;
          } finally {
            image.destroy();
          }
          if (imageBytes > limit) throw new Error("EXPORT_TOO_LARGE");
        }
        pages.push(result);
      } finally {
        page.destroy();
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  } finally {
    source.destroy();
  }
  if (format !== "pptx" && recognition !== "none") {
    const { recognizePage } = await import("./ocrEngine");
    for (const page of pages)
      if (!page.text.trim())
        page.text = (
          await recognizePage(doc, doc.pages[page.index], () => {}, recognition)
        )
          .map((mark) => mark.text)
          .join("\n");
  }
  if (format !== "pptx" && pages.every((page) => !page.text.trim()))
    throw new Error("NO_EXTRACTABLE_TEXT");
  let bytes: Uint8Array;
  let mime: string;
  if (format === "docx") {
    const { Document, Paragraph, Packer } = await import("docx");
    const document = new Document({
      creator: "HayPDF",
      sections: pages.map((page) => ({
        properties: {
          page: {
            size: {
              width: Math.round(page.width * 20),
              height: Math.round(page.height * 20),
            },
          },
        },
        children: page.text.split(/\r?\n/).map((line) => new Paragraph(line)),
      })),
    });
    bytes = new Uint8Array(await Packer.toArrayBuffer(document));
    mime =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  } else if (format === "xlsx") {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "HayPDF";
    for (const page of pages) {
      const sheet = workbook.addWorksheet(`Page ${page.index + 1}`);
      const lines = page.text.split(/\r?\n/);
      if (lines.length > 1048576) throw new Error("CONVERSION_LIMIT");
      for (const line of lines) {
        const cells = line.split(/\t| {2,}/);
        if (cells.length > 16384 || cells.some((value) => value.length > 32767))
          throw new Error("CONVERSION_LIMIT");
        sheet.addRow(cells);
      }
      sheet.columns.forEach((column) => {
        column.width = 28;
        column.alignment = { vertical: "top", wrapText: true };
      });
    }
    bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else if (format === "pptx") {
    const { default: Presentation } = await import("pptxgenjs");
    const presentation = new Presentation();
    presentation.author = "HayPDF";
    const width = 10,
      height = Math.min(
        50,
        Math.max(1, (10 * pages[0].height) / pages[0].width),
      );
    presentation.defineLayout({ name: "PDF", width, height });
    presentation.layout = "PDF";
    for (const page of pages) {
      const factor = Math.min(width / page.width, height / page.height);
      const w = page.width * factor,
        h = page.height * factor;
      presentation
        .addSlide()
        .addImage({
          data: `image/png;base64,${base64(page.image!)}`,
          x: (width - w) / 2,
          y: (height - h) / 2,
          w,
          h,
        });
    }
    bytes = new Uint8Array(
      (await presentation.write({
        outputType: "arraybuffer",
        compression: true,
      })) as ArrayBuffer,
    );
    mime =
      "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  } else {
    bytes = new TextEncoder().encode(
      `{\\rtf1\\ansi\\deff0\\uc1\n${pages.map((page) => rtfText(page.text)).join("\\page\n")}}`,
    );
    mime = "application/rtf";
  }
  if (bytes.length > limit) throw new Error("EXPORT_TOO_LARGE");
  return {
    name: `${doc.name.replace(/\.pdf$/i, "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")}.${format}`,
    bytes,
    mime,
  };
}
