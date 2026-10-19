import { useRef, useState } from "react";
import { clampZoom } from "../../application/shortcuts";
/** View state stays independent of document mutations and history. */
export function useEditorZoom() {
  const [scale, setScale] = useState(0.85);
  const canvasScroll = useRef<HTMLDivElement>(null);
  const lastWheelZoom = useRef(0);
  function zoom(direction: number) {
    setScale((value) => clampZoom(value + direction * 0.1));
  }
  function fit(mode: "width" | "page") {
    const container = canvasScroll.current;
    const sheet = container?.querySelector<HTMLElement>(".pdf-page");
    if (!container || !sheet) return;
    const style = getComputedStyle(container);
    const horizontal =
      parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const vertical =
      parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const width = sheet.offsetWidth / scale,
      height = sheet.offsetHeight / scale;
    const widthScale = (container.clientWidth - horizontal) / width;
    setScale(
      clampZoom(
        mode === "width"
          ? widthScale
          : Math.min(widthScale, (container.clientHeight - vertical) / height),
      ),
    );
  }
  function wheelZoom(direction: number) {
    const now = performance.now();
    if (now - lastWheelZoom.current < 45) return;
    lastWheelZoom.current = now;
    zoom(direction);
  }
  return { scale, setScale, canvasScroll, zoom, fit, wheelZoom };
}
