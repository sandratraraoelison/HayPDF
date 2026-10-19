import type { DragEvent } from "react";
import { useEditor } from "../EditorContext";

export function usePdfDrop() {
  const { busy, load } = useEditor();
  return {
    onDragOver: (event: DragEvent<HTMLDivElement>) => event.preventDefault(),
    onDrop: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!busy) void load(event.dataTransfer.files[0]);
    },
  };
}
