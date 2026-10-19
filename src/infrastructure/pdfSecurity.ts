import * as mupdf from "mupdf";

function save(doc: mupdf.PDFDocument, options: string): Uint8Array {
  const buffer = doc.saveToBuffer(options);
  try {
    return buffer.asUint8Array().slice();
  } finally {
    buffer.destroy();
  }
}

/** Quoted option values escape quotes by doubling them, per MuPDF option syntax. */
const optionValue = (value: string) => `"${value.replaceAll('"', '""')}"`;
export function protectPdf(bytes: Uint8Array, password: string): Uint8Array {
  if (
    !password ||
    new TextEncoder().encode(password).length > 127 ||
    /[\u0000-\u001f]/.test(password)
  )
    throw new Error("INVALID_PASSWORD");
  const doc = mupdf.Document.openDocument(bytes, "application/pdf").asPDF()!;
  try {
    const owner = crypto.randomUUID() + crypto.randomUUID();
    return save(
      doc,
      `garbage=4,compress,encrypt=aes-256,user-password=${optionValue(password)},owner-password=${optionValue(owner)}`,
    );
  } finally {
    doc.destroy();
  }
}

export function unlockPdf(
  bytes: Uint8Array,
  password?: string,
): Uint8Array | undefined {
  const doc = mupdf.Document.openDocument(bytes, "application/pdf").asPDF();
  if (!doc) throw new Error("Invalid PDF");
  try {
    if (!doc.needsPassword()) return bytes;
    if (password === undefined) return undefined;
    if (!doc.authenticatePassword(password)) throw new Error("WRONG_PASSWORD");
    return save(doc, "garbage=4,compress,encrypt=none");
  } finally {
    doc.destroy();
  }
}

/** Lossless optimization; never replace an already smaller input with a larger file. */
export function compressPdf(bytes: Uint8Array): Uint8Array {
  const doc = mupdf.Document.openDocument(bytes, "application/pdf").asPDF()!;
  try {
    const output = save(
      doc,
      "garbage=4,compress,compress-images,compress-fonts,objstms",
    );
    return output.length < bytes.length ? output : bytes.slice();
  } finally {
    doc.destroy();
  }
}
