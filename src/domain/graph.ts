import type { Rect } from "./imageLayout";
export type GraphKind = "bars" | "pie" | "process";
export interface GraphItem {
  label: string;
  detail: string;
  value: number;
  color: string;
}
export interface GraphDraft {
  area: Rect;
  kind: GraphKind;
  title: string;
  items: GraphItem[];
  sourceText: string;
}
export const graphColors = [
  "#18849d",
  "#49aaa9",
  "#f1b757",
  "#aab7c2",
  "#8060ce",
  "#de7664",
];
export interface GraphPath {
  d: string;
  color: string;
  fill: boolean;
}
export interface GraphText {
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  center?: boolean;
  maxWidth: number;
}
export function layoutGraph(graph: GraphDraft) {
  const { width: w, height: h } = graph.area;
  if (
    w < 180 ||
    h < 80 ||
    !graph.items.length ||
    graph.items.length > 12 ||
    graph.items.some(
      (i) =>
        !Number.isFinite(i.value) ||
        i.value < 0 ||
        !/^#[0-9a-f]{6}$/i.test(i.color),
    )
  )
    throw new Error(
      "Graphique invalide : 1 à 12 éléments, valeurs positives ou nulles et zone d’au moins 180 × 80 points.",
    );
  const paths: GraphPath[] = [],
    texts: GraphText[] = [];
  const addText = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    size = 10,
    color = "#172b40",
    center = false,
  ) => {
    if (text)
      texts.push({
        text,
        x,
        y,
        maxWidth,
        size: Math.min(
          size,
          Math.max(6, maxWidth / Math.max(1, text.length * 0.65)),
        ),
        color,
        center,
      });
  };
  const line = (d: string, color = "#8295a5") =>
    paths.push({ d, color, fill: false });
  const rect = (
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ) =>
    paths.push({
      d: `M ${x} ${y} h ${width} v ${height} h ${-width} Z`,
      color,
      fill: true,
    });
  addText(graph.title, w / 2, 16, w - 20, 14, "#172b40", true);
  if (graph.kind === "bars") {
    if (h < 120)
      throw new Error(
        "Un histogramme nécessite une hauteur d’au moins 120 points.",
      );
    const left = 32,
      top = 32,
      bottom = h - 28,
      cw = w - left - 12,
      ch = bottom - top;
    const maximum = Math.max(10, ...graph.items.map((i) => i.value));
    for (let i = 0; i <= 4; i++) {
      const y = bottom - (ch * i) / 4;
      line(`M ${left} ${y} H ${w - 12}`, "#d4dde4");
      addText(
        Number((maximum * (i / 4)).toPrecision(4)).toString(),
        2,
        y + 3,
        26,
        8,
        "#425566",
      );
    }
    const step = cw / graph.items.length;
    graph.items.forEach((item, i) => {
      const height = ch * (item.value / maximum),
        x = left + i * step + step * 0.16;
      rect(x, bottom - height, step * 0.68, height, item.color);
      addText(
        item.label,
        x + step * 0.34,
        h - 12,
        step - 3,
        10,
        "#172b40",
        true,
      );
      addText(
        String(item.value),
        x + step * 0.34,
        Math.max(top - 3, bottom - height - 4),
        step - 2,
        8,
        "#425566",
        true,
      );
    });
  } else if (graph.kind === "pie") {
    const total = graph.items.reduce((sum, i) => sum + i.value, 0);
    if (total <= 0 || !Number.isFinite(total))
      throw new Error("Le total du camembert doit être supérieur à zéro.");
    if ((h - 46) / graph.items.length < 11)
      throw new Error(
        "La zone est trop petite pour ces étapes. Réduisez le nombre d’éléments.",
      );
    const cx = w * 0.26,
      cy = (h + 26) / 2,
      r = Math.min(w * 0.22, (h - 44) / 2);
    let angle = -Math.PI / 2;
    graph.items.forEach((item, i) => {
      const delta = (item.value / total) * Math.PI * 2;
      if (delta > 0) {
        const sx = cx + Math.cos(angle) * r,
          sy = cy + Math.sin(angle) * r;
        let d = `M ${cx} ${cy} L ${sx} ${sy}`;
        const count = Math.ceil(delta / (Math.PI / 2));
        for (let j = 0; j < count; j++) {
          const end = angle + delta / count,
            k = (4 / 3) * Math.tan((end - angle) / 4);
          d += ` C ${cx + r * (Math.cos(angle) - k * Math.sin(angle))} ${cy + r * (Math.sin(angle) + k * Math.cos(angle))} ${cx + r * (Math.cos(end) + k * Math.sin(end))} ${cy + r * (Math.sin(end) - k * Math.cos(end))} ${cx + r * Math.cos(end)} ${cy + r * Math.sin(end)}`;
          angle = end;
        }
        paths.push({ d: d + " Z", color: item.color, fill: true });
      }
      const y = 36 + (i * (h - 46)) / graph.items.length;
      rect(w * 0.55, y - 7, 7, 7, item.color);
      addText(
        `${item.label}  ${Math.round((item.value / total) * 1000) / 10} %`,
        w * 0.55 + 12,
        y,
        w * 0.45 - 22,
        10,
      );
    });
  } else {
    const columns = Math.min(
        graph.items.length,
        Math.max(1, Math.min(4, Math.floor((w - 20) / 100))),
      ),
      rows = Math.ceil(graph.items.length / columns);
    const stepX = (w - 20) / columns,
      stepY = (h - 32) / rows;
    if (stepY < 34)
      throw new Error(
        "La zone est trop petite pour ces étapes. Réduisez le nombre d’éléments.",
      );
    const positions = graph.items.map((_, i) => {
      const row = Math.floor(i / columns),
        col = row % 2 ? columns - 1 - (i % columns) : i % columns;
      return {
        x: 10 + col * stepX,
        y: 30 + row * stepY + Math.max(0, (stepY - 14 - 60) / 2),
      };
    });
    positions.forEach((p, i) => {
      const bw = stepX - 18,
        bh = Math.min(60, stepY - 14);
      const channels = [1, 3, 5]
        .map(
          (offset) =>
            parseInt(graph.items[i].color.slice(offset, offset + 2), 16) / 255,
        )
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      const textColor =
        channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 >
        0.179
          ? "#000000"
          : "#ffffff";
      rect(p.x, p.y, bw, bh, graph.items[i].color);
      addText(
        graph.items[i].label,
        p.x + bw / 2,
        p.y + bh * 0.43,
        bw - 10,
        11,
        textColor,
        true,
      );
      addText(
        graph.items[i].detail,
        p.x + bw / 2,
        p.y + bh * 0.73,
        bw - 10,
        9,
        textColor,
        true,
      );
      const next = positions[i + 1];
      if (next) {
        let x1: number, y1: number, x2: number, y2: number;
        if (next.y === p.y) {
          const right = next.x > p.x;
          x1 = right ? p.x + bw : p.x;
          y1 = p.y + bh / 2;
          x2 = right ? next.x : next.x + bw;
          y2 = y1;
        } else {
          x1 = p.x + bw / 2;
          y1 = p.y + bh;
          x2 = next.x + bw / 2;
          y2 = next.y;
        }
        const angle = Math.atan2(y2 - y1, x2 - x1),
          a = 4;
        line(
          `M ${x1} ${y1} L ${x2} ${y2} M ${x2 - a * Math.cos(angle - 0.5)} ${y2 - a * Math.sin(angle - 0.5)} L ${x2} ${y2} L ${x2 - a * Math.cos(angle + 0.5)} ${y2 - a * Math.sin(angle + 0.5)}`,
        );
      }
    });
  }
  return { paths, texts };
}
