import * as mupdf from "mupdf";
import { diffWordsWithSpace, type Change } from "diff";
export interface PdfComparison {
  leftText: string;
  rightText: string;
  changes: Change[];
  leftImage: Uint8Array;
  rightImage: Uint8Array;
  differenceImage: Uint8Array;
  changedPixels: number;
  totalPixels: number;
  leftPages: number;
  rightPages: number;
}
export function comparePdfPages(
  leftBytes: Uint8Array,
  rightBytes: Uint8Array,
  index: number,
): PdfComparison {
  const left = mupdf.Document.openDocument(leftBytes, "application/pdf"),
    right = mupdf.Document.openDocument(rightBytes, "application/pdf");
  let commonScale = 1;
  const render = (doc: mupdf.Document) => {
    if (index >= doc.countPages()) return undefined;
    const page = doc.loadPage(index);
    try {
      const pixels = page.toPixmap(
          mupdf.Matrix.scale(commonScale, commonScale),
          mupdf.ColorSpace.DeviceRGB,
          false,
          true,
        ),
        text = page.toStructuredText({});
      try {
        return {
          width: pixels.getWidth(),
          height: pixels.getHeight(),
          pixels: pixels.getPixels().slice(),
          image: pixels.asPNG().slice(),
          text: text.asText(),
        };
      } finally {
        pixels.destroy();
        text.destroy();
      }
    } finally {
      page.destroy();
    }
  };
  try {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= Math.max(left.countPages(), right.countPages())
    )
      throw new Error("INVALID_PAGE_RANGE");
    for (const doc of [left, right])
      if (index < doc.countPages()) {
        const page = doc.loadPage(index);
        try {
          const b = page.getBounds();
          commonScale = Math.min(
            commonScale,
            1000 / Math.max(b[2] - b[0], b[3] - b[1]),
          );
        } finally {
          page.destroy();
        }
      }
    const a = render(left),
      b = render(right),
      width = Math.max(a?.width ?? 0, b?.width ?? 0),
      height = Math.max(a?.height ?? 0, b?.height ?? 0);
    const image = new mupdf.Pixmap(
        mupdf.ColorSpace.DeviceRGB,
        [0, 0, width, height],
        false,
      ),
      pixels = image.getPixels();
    let changedPixels = 0;
    const at = (side: typeof a, x: number, y: number, c: number) =>
      side && x < side.width && y < side.height
        ? side.pixels[(y * side.width + x) * 3 + c]
        : 255;
    try {
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const changed = [0, 1, 2].some(
            (c) => Math.abs(at(a, x, y, c) - at(b, x, y, c)) > 20,
          );
          if (changed) changedPixels++;
          const offset = (y * width + x) * 3;
          pixels[offset] = changed ? 220 : at(a, x, y, 0);
          pixels[offset + 1] = changed ? 45 : at(a, x, y, 1);
          pixels[offset + 2] = changed ? 70 : at(a, x, y, 2);
        }
      return {
        leftText: a?.text ?? "",
        rightText: b?.text ?? "",
        changes: diffWordsWithSpace(a?.text ?? "", b?.text ?? ""),
        leftImage: a?.image ?? image.asPNG().slice(),
        rightImage: b?.image ?? image.asPNG().slice(),
        differenceImage: image.asPNG().slice(),
        changedPixels,
        totalPixels: width * height,
        leftPages: left.countPages(),
        rightPages: right.countPages(),
      };
    } finally {
      image.destroy();
    }
  } finally {
    left.destroy();
    right.destroy();
  }
}
