import type * as MuPDF from "mupdf";
type NotoSerifFace = "Regular" | "Bold" | "Italic" | "BoldItalic";
const urls: Record<NotoSerifFace, URL> = {
  Regular: new URL("../assets/fonts/NotoSerif-Regular.ttf", import.meta.url),
  Bold: new URL("../assets/fonts/NotoSerif-Bold.ttf", import.meta.url),
  Italic: new URL("../assets/fonts/NotoSerif-Italic.ttf", import.meta.url),
  BoldItalic: new URL(
    "../assets/fonts/NotoSerif-BoldItalic.ttf",
    import.meta.url,
  ),
};
const buffers = new Map<NotoSerifFace, Promise<Uint8Array>>();
async function readFont(face: NotoSerifFace): Promise<Uint8Array> {
  if (typeof window === "undefined") {
    const { readFile } = await import("node:fs/promises");
    return new Uint8Array(await readFile(urls[face]));
  }
  const response = await fetch(urls[face]);
  if (!response.ok) throw new Error("NATIVE_FONT_UNAVAILABLE");
  return new Uint8Array(await response.arrayBuffer());
}
/** Only the matching Noto Serif face is eligible; other families are never silently replaced. */
export async function loadMatchingFullFont(
  original: MuPDF.Font,
): Promise<MuPDF.Font | undefined> {
  const name = original
    .getName()
    .replace(/^[A-Z]{6}\+/, "")
    .replace(/[^a-z]/gi, "")
    .toLowerCase();
  if (!/^notoserif(?:regular|bold|italic|bolditalic)?$/.test(name)) return;
  const face: NotoSerifFace = original.isBold()
    ? original.isItalic()
      ? "BoldItalic"
      : "Bold"
    : original.isItalic()
      ? "Italic"
      : "Regular";
  let bytes = buffers.get(face);
  if (!bytes) {
    bytes = readFont(face);
    buffers.set(face, bytes);
  }
  try {
    const mupdf = await import("mupdf");
    return new mupdf.Font(`NotoSerif-${face}`, await bytes);
  } catch (error) {
    buffers.delete(face);
    throw error;
  }
}
