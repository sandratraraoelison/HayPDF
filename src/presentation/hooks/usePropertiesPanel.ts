import { useEffect, useRef } from "react";
import type { NativeText, Tool } from "../../domain/document";
import type { NativeImage } from "../../domain/nativeImage";

export function usePropertiesPanel(
  markId: string | undefined,
  text: NativeText | undefined,
  image: NativeImage | undefined,
  tool: Tool,
  pageId: string | undefined,
) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [markId, text, image, tool, pageId]);
  return panel;
}
