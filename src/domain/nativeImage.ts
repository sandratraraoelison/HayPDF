import type { Rect } from "./imageLayout";

export interface NativeImage extends Rect {
  index: number;
  kind?: "raster" | "vector";
  pixelWidth?: number;
  pixelHeight?: number;
  polygon?: { x: number; y: number }[];
  sourceBounds?: Rect;
}
