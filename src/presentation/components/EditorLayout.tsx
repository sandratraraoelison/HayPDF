import { usePdfDrop } from "../hooks/usePdfDrop";
import { useEditor } from "../EditorContext";
import { ShortcutHelp } from "../ShortcutHelp";
import { EditorHeader } from "./EditorHeader";
import { EditorToolbar } from "./EditorToolbar";
import { EditorSidebar } from "./EditorSidebar";
import { AdvancedToolDialog } from "./AdvancedToolDialog";
import { PropertiesSidebar } from "./PropertiesSidebar";
import { DocumentWorkspace } from "./DocumentWorkspace";
import { FileInputs } from "./FileInputs";
import { DocumentToolDialog } from "./DocumentToolDialog";
import { UnlockPdfDialog } from "./UnlockPdfDialog";
import { useWorkbench } from "../WorkbenchContext";
import { WorkbenchDialog } from "./WorkbenchDialog";
import { VersionsDialog } from "./VersionsDialog";
import { AboutDialog } from "./AboutDialog";
import { TableEditorDialog } from "./TableEditorDialog";
import { GraphEditorDialog } from "./GraphEditorDialog";
export function EditorLayout() {
  const { feature } = useWorkbench();
  const {
    t,
    busy,
    showShortcuts,
    setShowShortcuts,
    advancedAction,
    documentTool,
    lockedFile,
    showVersions,
    showAbout,
    tableEditor,
    graphEditor,
  } = useEditor();
  const dropHandlers = usePdfDrop();
  return (
    <div className="app" {...dropHandlers}>
      <FileInputs />
      <EditorHeader />
      <EditorToolbar />
      <div className="workspace" inert={busy}>
        <EditorSidebar />
        <DocumentWorkspace />
        <PropertiesSidebar />
      </div>
      {advancedAction && <AdvancedToolDialog key={advancedAction} />}
      {documentTool && <DocumentToolDialog key={documentTool} />}
      {lockedFile && <UnlockPdfDialog />}
      {showVersions && <VersionsDialog />}
      {showAbout && <AboutDialog />}
      {tableEditor.draft && <TableEditorDialog />}
      {graphEditor.draft && <GraphEditorDialog />}
      {feature && <WorkbenchDialog key={feature} />}
      {showShortcuts && (
        <ShortcutHelp t={t} onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}
