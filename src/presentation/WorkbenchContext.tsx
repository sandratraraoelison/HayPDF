import { createContext, useContext, useState, type ReactNode } from "react";
import { useEditor } from "./EditorContext";
import { type DocumentModel } from "../domain/document";
import { type WorkbenchFeature } from "../domain/workbench";
import { saveFile } from "../infrastructure/fileGateway";
import { exportDocument } from "../infrastructure/pdfEngine";

function useWorkbenchController() {
  const editor = useEditor(),
    [feature, setFeature] = useState<WorkbenchFeature>();
  function openFeature(next: WorkbenchFeature) {
    editor.setNotice("");
    setFeature(next);
  }
  async function execute(action: () => Promise<void>) {
    await editor.runTask(action);
  }
  async function modify(
    action: (doc: DocumentModel) => Promise<DocumentModel>,
  ) {
    if (!editor.doc) return;
    await execute(async () => {
      editor.commitDocument(await action(editor.doc!));
      editor.setNotice(editor.t("Modification appliquée."), "success");
    });
  }
  async function download(name: string, bytes: Uint8Array, mime: string) {
    if (await saveFile(name, bytes, mime))
      editor.setNotice(editor.t("Export terminé."), "success");
  }
  async function downloadCurrent() {
    if (editor.doc)
      await execute(async () =>
        download(
          editor.doc!.name,
          await exportDocument(editor.doc!),
          "application/pdf",
        ),
      );
  }
  return {
    query:editor.queryTask,
    feature,
    openFeature,
    closeFeature: () => setFeature(undefined),
    execute,
    modify,
    download,
    downloadCurrent,
  };
}
const Context = createContext<ReturnType<typeof useWorkbenchController> | null>(
  null,
);
export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const state = useWorkbenchController();
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function useWorkbench() {
  const value = useContext(Context);
  if (!value) throw new Error("Workbench provider missing");
  return value;
}
