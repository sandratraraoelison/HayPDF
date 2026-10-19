import type { ShapeKind, StrokePoint } from "./shapes";
export type Tool =
  | "select"
  | "native"
  | "text"
  | "highlight"
  | "rectangle"
  | "image"
  | "signature"
  | "stamp";
export interface Mark {
  id: string;
  kind: Exclude<Tool, "select" | "native">;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  size: number;
  color: string;
  data?: string;
  shape?: ShapeKind;
  points?: StrokePoint[];
  imageFit?: "contain" | "cover" | "fill";
  lockAspectRatio?: boolean;
  naturalWidth?: number;
  naturalHeight?: number;
  invisible?: boolean;
  bold?: boolean;
  italic?: boolean;
  baselineOffset?: number;
  noWrap?: boolean;
  font: "Helvetica" | "TimesRoman" | "Courier";
}
export interface PageModel {
  id: string;
  source: number;
  index: number;
  rotation: number;
  marks: Mark[];
}
export interface DocumentModel {
  name: string;
  sources: Uint8Array[];
  pages: PageModel[];
}
export const uid = () => crypto.randomUUID();
export interface NativeText {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  size: number;
  font?: Mark["font"];
  color?: string;
  bold?: boolean;
  italic?: boolean;
  baselineOffset?: number;
  fontName?: string;
  availableWidth?: number;
}
