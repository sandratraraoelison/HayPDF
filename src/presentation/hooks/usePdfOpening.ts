import { useState } from "react";
import type { DocumentModel } from "../../domain/document";
import { unlockPdf } from "../../infrastructure/pdfSecurity";
import { mergeDocument, readDocument } from "../../infrastructure/pdfEngine";

export function usePdfOpening({
  doc,
  commit,
  onOpened,
  run,
}: {
  doc?: DocumentModel;
  commit: (doc: DocumentModel) => void;
  onOpened: (doc: DocumentModel) => void;
  run: (action: () => Promise<void>) => Promise<void>;
}) {
  const [lockedFile, setLockedFile] = useState<{
    bytes: Uint8Array;
    name: string;
    merge: boolean;
  }>();
  async function accept(bytes: Uint8Array, name: string, merge: boolean) {
    if (merge && doc) commit(await mergeDocument(doc, bytes));
    else onOpened(await readDocument(bytes, name));
    setLockedFile(undefined);
  }
  async function load(file?: File, merge = false) {
    if (!file) return;
    await run(async () => {
      if (file.size > 100 * 1024 * 1024)
        throw new Error("La limite par fichier est de 100 Mo.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const decrypted = unlockPdf(bytes);
      if (!decrypted) {
        setLockedFile({ bytes, name: file.name, merge });
        return;
      }
      await accept(decrypted, file.name, merge);
    });
  }
  async function unlockDocument(password: string) {
    if (!lockedFile) return;
    await run(async () => {
      const bytes = unlockPdf(lockedFile.bytes, password)!;
      await accept(bytes, lockedFile.name, lockedFile.merge);
    });
  }
  return {
    load,
    lockedFile,
    unlockDocument,
    cancelUnlock: () => setLockedFile(undefined),
  };
}
