export async function readReplacementFont(
  file: File,
): Promise<{ bytes: Uint8Array; name: string }> {
  if (file.size > 20 * 1024 * 1024)
    throw new Error("FONT_FILE_TOO_LARGE: maximum 20 MB");
  if (!/\.(ttf|otf)$/i.test(file.name))
    throw new Error("FONT_FILE_FORMAT: expected TTF or OTF");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mupdf = await import("mupdf");
  const font = new mupdf.Font(file.name, bytes);
  try {
    return { bytes, name: font.getName() };
  } finally {
    font.destroy();
  }
}
