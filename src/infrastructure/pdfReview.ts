import * as mupdf from "mupdf";
import type { DocumentModel } from "../domain/document";
import type { ReviewComment } from "../domain/workbench";
import { exportDocument } from "./pdfEngine";
import { mutatePdf, withPdfPage } from "./pdfMutation";

export async function readComments(
  doc: DocumentModel,
): Promise<ReviewComment[]> {
  const pdf = mupdf.Document.openDocument(
    await exportDocument(doc),
    "application/pdf",
  ).asPDF()!;
  const comments: ReviewComment[] = [];
  try {
    for (let i = 0; i < pdf.countPages(); i++)
      withPdfPage(pdf, i, (page) => {
        const annotations = page.getAnnotations();
        try {
          const ids = new Map(
            annotations.map((a) => [
              a.getObject().asIndirect(),
              a.getName() || `p${i}-${a.getObject().asIndirect()}`,
            ]),
          );
          for (const annotation of annotations)
            if (annotation.getType() === "Text") {
              const rect = annotation.getRect(),
                reply = annotation.getObject().get("IRT");
              const date = annotation.getModificationDate();
              comments.push({
                id: ids.get(annotation.getObject().asIndirect())!,
                page: i,
                author: annotation.getAuthor(),
                text: annotation.getContents(),
                date: Number.isFinite(date.getTime())
                  ? date.toISOString()
                  : new Date(0).toISOString(),
                x: rect[0],
                y: rect[1],
                replyTo: reply.isIndirect()
                  ? ids.get(reply.asIndirect())
                  : undefined,
              });
            }
        } finally {
          annotations.forEach((annotation) => annotation.destroy());
        }
      });
    return comments;
  } finally {
    pdf.destroy();
  }
}
export async function writeComments(
  doc: DocumentModel,
  comments: ReviewComment[],
): Promise<DocumentModel> {
  if (new Set(comments.map((c) => c.id)).size !== comments.length)
    throw new Error("INVALID_REVIEW");
  for (const comment of comments) {
    const visited = new Set<string>();
    let current: ReviewComment | undefined = comment;
    while (current?.replyTo) {
      if (visited.has(current.id)) throw new Error("INVALID_REVIEW");
      visited.add(current.id);
      current = comments.find((c) => c.id === current!.replyTo);
    }
  }
  if (
    comments.some(
      (c) =>
        !c.id ||
        !Number.isInteger(c.page) ||
        c.page < 0 ||
        c.page >= doc.pages.length ||
        !Number.isFinite(c.x + c.y) ||
        !Number.isFinite(Date.parse(c.date)),
    )
  )
    throw new Error("INVALID_REVIEW");
  return mutatePdf(doc, (pdf) => {
    for (let i = 0; i < pdf.countPages(); i++)
      withPdfPage(pdf, i, (page) => {
        const old = page.getAnnotations();
        try {
          for (const a of old)
            if (a.getType() === "Text") page.deleteAnnotation(a);
        } finally {
          old.forEach((a) => a.destroy());
        }
        const created = new Map<string, mupdf.PDFAnnotation>();
        try {
          const bounds = page.getBounds();
          for (const comment of comments.filter((c) => c.page === i)) {
            if (
              comment.x < bounds[0] ||
              comment.y < bounds[1] ||
              comment.x + 20 > bounds[2] ||
              comment.y + 20 > bounds[3]
            )
              throw new Error("INVALID_REVIEW_POSITION");
            const a = page.createAnnotation("Text");
            created.set(comment.id, a);
            a.setName(comment.id);
            a.setRect([comment.x, comment.y, comment.x + 20, comment.y + 20]);
            a.setContents(comment.text);
            a.setAuthor(comment.author);
            a.setColor([1, 0.75, 0.05]);
            a.setIcon("Comment");
            a.setCreationDate(new Date(comment.date));
            a.setModificationDate(new Date(comment.date));
            a.setFlags(mupdf.PDFAnnotation.IS_PRINT);
            a.update();
          }
          for (const comment of comments.filter(
            (c) => c.page === i && c.replyTo,
          )) {
            const parent = created.get(comment.replyTo!);
            if (!parent) throw new Error("INVALID_REVIEW");
            created.get(comment.id)!.getObject().put("IRT", parent.getObject());
            created.get(comment.id)!.getObject().put("RT", pdf.newName("R"));
          }
        } finally {
          created.forEach((a) => a.destroy());
        }
      });
  });
}

export async function reviewFingerprint(doc: DocumentModel): Promise<string> {
  const pdf = mupdf.Document.openDocument(
    await exportDocument(doc),
    "application/pdf",
  );
  const parts: string[] = [];
  try {
    for (let i = 0; i < pdf.countPages(); i++) {
      const page = pdf.loadPage(i);
      try {
        const bounds = page.getBounds(),
          scale = Math.min(
            0.5,
            600 / Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1]),
          );
        const pixels = page.toPixmap(
          mupdf.Matrix.scale(scale, scale),
          mupdf.ColorSpace.DeviceRGB,
          false,
          false,
        );
        try {
          parts.push(
            `${bounds.join(",")}:${Array.from(
              new Uint8Array(
                await crypto.subtle.digest(
                  "SHA-256",
                  new Uint8Array(pixels.getPixels()),
                ),
              ),
            )
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("")}`,
          );
        } finally {
          pixels.destroy();
        }
      } finally {
        page.destroy();
      }
    }
  } finally {
    pdf.destroy();
  }
  return parts.join(";");
}
export async function exportReview(doc: DocumentModel) {
  return {
    format: "haypdf-review",
    version: 1,
    documentKey: await reviewFingerprint(doc),
    comments: await readComments(doc),
  };
}
export async function importReview(
  doc: DocumentModel,
  value: unknown,
): Promise<DocumentModel> {
  const data = value as Awaited<ReturnType<typeof exportReview>>;
  if (
    data?.format !== "haypdf-review" ||
    data.version !== 1 ||
    !Array.isArray(data.comments) ||
    data.documentKey !== (await reviewFingerprint(doc))
  )
    throw new Error("REVIEW_DOCUMENT_MISMATCH");
  const existing = await readComments(doc),
    merged = new Map(existing.map((c) => [c.id, c]));
  for (const c of data.comments) {
    if (
      typeof c?.id !== "string" ||
      typeof c.author !== "string" ||
      typeof c.text !== "string" ||
      typeof c.date !== "string" ||
      (c.replyTo !== undefined && typeof c.replyTo !== "string")
    )
      throw new Error("INVALID_REVIEW");
    const previous = merged.get(c.id);
    if (!previous || Date.parse(c.date) >= Date.parse(previous.date))
      merged.set(c.id, c);
  }
  return writeComments(doc, [...merged.values()]);
}
