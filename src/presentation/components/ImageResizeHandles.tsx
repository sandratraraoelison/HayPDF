import type { PointerEventHandler } from "react";
import type { ResizeHandle } from "../../domain/imageLayout";
import { Button } from "../ui/Button";
const handles: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
export function ImageResizeHandles({
  onStart,
  t,
  label = "Redimensionner l’image",
}: {
  onStart: (handle: ResizeHandle) => PointerEventHandler<HTMLButtonElement>;
  t: (text: string) => string;
  label?: string;
}) {
  return (
    <>
      {handles.map((handle) => (
        <Button
          key={handle}
          className={`image-resize-handle handle-${handle}`}
          tabIndex={-1}
          title={t(label)}
          aria-label={`${t(label)} (${handle})`}
          onPointerDown={onStart(handle)}
          onClick={(event) => event.stopPropagation()}
        />
      ))}
    </>
  );
}
