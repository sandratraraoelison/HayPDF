import { createImagesPdf } from "./documentExports";

/** Inspect file contents: file pickers may provide an empty or inaccurate MIME type. */
export function imageDocumentType(
  bytes: Uint8Array,
): "png" | "jpeg" | undefined {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value))
    return "png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpeg";
}

export async function readImageDocument(bytes: Uint8Array, name: string) {
  const type = imageDocumentType(bytes);
  if (!type) throw new Error("INVALID_IMAGE_TYPE");
  const doc = await createImagesPdf([{ bytes, type }]);
  return { ...doc, name: name.replace(/\.[^.]+$/, "") + ".pdf" };
}
