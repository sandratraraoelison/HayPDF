import { createContext, useContext, type ReactNode } from "react";
import {
  useEditorController,
  type EditorController,
} from "./hooks/useEditorController";
const EditorContext = createContext<EditorController | null>(null);
/** A single editor session owns its history, selection and file operations. */
export function EditorProvider({ children }: { children: ReactNode }) {
  const editor = useEditorController();
  return (
    <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
  );
}
export function useEditor(): EditorController {
  const editor = useContext(EditorContext);
  if (!editor)
    throw new Error("Editor components must be rendered inside EditorProvider");
  return editor;
}
