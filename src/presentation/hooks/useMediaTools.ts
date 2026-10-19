import { useEffect, useState } from "react";
import { useEditor } from "../EditorContext";
import { useWorkbench } from "../WorkbenchContext";
import {
  listAttachments,
  attachFile,
  removeAttachment,
  type EmbeddedFile,
} from "../../infrastructure/pdfAttachments";
export function useMediaTools() {
  const { doc, pageIndex } = useEditor(),
    { execute, query:runQuery, modify, download } = useWorkbench();
  const [files, setFiles] = useState<EmbeddedFile[]>([]),
    [selected, setSelected] = useState<EmbeddedFile>();
  useEffect(() => {
    let active = true;
    if (doc)
      void runQuery(async () => {
        const result = await listAttachments(doc);
        if (active) setFiles(result);
      });
    return () => {
      active = false;
    };
  }, [doc]);
  async function add(file?: File) {
    if (file)
      await modify(async (source) =>
        attachFile(source, pageIndex, {
          name: file.name,
          type: file.type || "application/octet-stream",
          bytes: new Uint8Array(await file.arrayBuffer()),
        }),
      );
  }
  async function remove(name: string) {
    await modify((source) => removeAttachment(source, name));
    setSelected(undefined);
  }
  return {
    files,
    selected,
    setSelected,
    add,
    remove,
    save: (file: EmbeddedFile) =>
      execute(() => download(file.name, file.bytes, file.type)),
  };
}
