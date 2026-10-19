import { uid, type DocumentModel } from "../domain/document";
export function duplicateDocumentPage(
  doc: DocumentModel,
  index: number,
): DocumentModel {
  const page = doc.pages[index];
  if (!page) throw new Error("INVALID_PAGE_RANGE");
  const copy = {
    ...page,
    id: uid(),
    marks: page.marks.map((mark) => ({ ...mark, id: uid() })),
  };
  return {
    ...doc,
    pages: [
      ...doc.pages.slice(0, index + 1),
      copy,
      ...doc.pages.slice(index + 1),
    ],
  };
}
