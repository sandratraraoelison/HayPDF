import type { DocumentModel, NativeText, Mark } from "../domain/document";
import { uid } from "../domain/document";
import { exportDocument, readDocument } from "../infrastructure/pdfEngine";
import { removeNativeText } from "../infrastructure/nativeTextEngine";
import { replaceWithOriginalFont } from "../infrastructure/nativeFontReplacement";
export async function replaceNativeText(
  doc: DocumentModel,
  pageIndex: number,
  block: NativeText,
  replacement: string,
  style: Pick<Mark, "font" | "size" | "color">,
  options: { fontData?: Uint8Array } = {},
): Promise<DocumentModel> {
  if (/[\r\n]/.test(replacement)) throw new Error("NATIVE_TEXT_SINGLE_LINE");
  if (
    replacement === block.text &&
    block.font &&
    block.color &&
    style.font === block.font &&
    style.size === block.size &&
    style.color === block.color
  )
    return doc;
  // Consolidate current edits before altering native content, preserving the undo snapshot.
  const bytes = await exportDocument(doc);
  if (!block.font || style.font === block.font) {
    const result = await replaceWithOriginalFont(
      bytes,
      pageIndex,
      block,
      replacement,
      style,
      options,
    );
    return readDocument(result, doc.name);
  }
  const redacted = await removeNativeText(bytes, pageIndex, block);
  const next = await readDocument(redacted, doc.name);
  if (replacement) {
    next.pages[pageIndex].marks.push({
      id: uid(),
      kind: "text",
      ...block,
      text: replacement,
      ...style,
      noWrap: true,
      height: Math.max(block.height, style.size * 1.3),
    });
  }
  // Validate encoding before replacing the user's current snapshot.
  const exported = await exportDocument(next);
  // Render the actual final PDF with PDF.js; HTML font metrics cannot reproduce it exactly.
  return readDocument(exported, doc.name);
}
