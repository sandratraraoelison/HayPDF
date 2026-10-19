import { EditorProvider } from "./EditorContext";
import { WorkbenchProvider } from "./WorkbenchContext";
import { EditorLayout } from "./components/EditorLayout";
export function App() {
  return (
    <EditorProvider>
      <WorkbenchProvider>
        <EditorLayout />
      </WorkbenchProvider>
    </EditorProvider>
  );
}
