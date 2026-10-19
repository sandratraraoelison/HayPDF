import type { DocumentModel } from "./document";

export interface DocumentVersion {
  id: string;
  name: string;
  createdAt: number;
  document: DocumentModel;
}

/** Snapshots share immutable document data; no PDF source is rewritten. */
export function captureVersion(
  document: DocumentModel,
  name: string,
): DocumentVersion {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: Date.now(),
    document,
  };
}
