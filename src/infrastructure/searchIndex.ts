import * as mupdf from "mupdf";
export interface IndexedPdf {
  id: string;
  name: string;
  pages: string[];
  bytes: Uint8Array;
}
export interface SearchHit {
  id: string;
  name: string;
  page: number;
  excerpt: string;
  count: number;
}
export async function indexPdf(
  bytes: Uint8Array,
  name: string,
): Promise<IndexedPdf> {
  const pdf = mupdf.Document.openDocument(bytes, "application/pdf"),
    pages: string[] = [];
  try {
    for (let i = 0; i < pdf.countPages(); i++) {
      const page = pdf.loadPage(i);
      try {
        const text = page.toStructuredText({});
        try {
          pages.push(text.asText());
        } finally {
          text.destroy();
        }
      } finally {
        page.destroy();
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return { id: crypto.randomUUID(), name, pages, bytes };
  } finally {
    pdf.destroy();
  }
}
export function searchIndexedPdfs(
  index: IndexedPdf[],
  query: string,
): SearchHit[] {
  const needle = query.toLocaleLowerCase();
  if (!needle.trim()) return [];
  return index.flatMap((doc) =>
    doc.pages.flatMap((text, page) => {
      const haystack = text.toLocaleLowerCase();
      let first = -1,
        count = 0,
        pos = 0;
      while ((pos = haystack.indexOf(needle, pos)) !== -1) {
        if (first === -1) first = pos;
        count++;
        pos += needle.length;
      }
      return count
        ? [
            {
              id: doc.id,
              name: doc.name,
              page,
              excerpt: text.slice(
                Math.max(0, first - 60),
                first + needle.length + 100,
              ),
              count,
            },
          ]
        : [];
    }),
  );
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("haypdf-search", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("documents", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function loadSearchIndex(): Promise<IndexedPdf[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("documents", "readonly"),
        request = tx.objectStore("documents").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
export async function saveSearchIndex(documents: IndexedPdf[]): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("documents", "readwrite"),
        store = tx.objectStore("documents");
      store.clear();
      documents.forEach((doc) => store.put(doc));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
