import * as mupdf from "mupdf";
import { PDFDocument, PDFName, PDFString, PDFHexString } from "pdf-lib";
const escape = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
async function colorProfile(): Promise<Uint8Array> {
  if (typeof window === "undefined")
    return new Uint8Array(
      await (
        await import("node:fs/promises")
      ).readFile(new URL("../assets/color/sRGB-v2-micro.icc", import.meta.url)),
    );
  const address=new URL("../assets/color/sRGB-v2-micro.icc",import.meta.url);
  if(address.protocol==="data:")return Uint8Array.from(atob(address.href.slice(address.href.indexOf(",")+1)),char=>char.charCodeAt(0));
  const response = await fetch(address);
  if (!response.ok) throw new Error("ICC_PROFILE_UNAVAILABLE");
  return new Uint8Array(await response.arrayBuffer());
}
/** Archival visual derivative: no actions, annotations, transparency, attachments or unembedded fonts. */
export async function createArchivalPdf(
  bytes: Uint8Array,
  title: string,
  dpi: number,
): Promise<Uint8Array> {
  if (!Number.isFinite(dpi) || dpi < 72 || dpi > 600)
    throw new Error("INVALID_DPI");
  const source = mupdf.Document.openDocument(bytes, "application/pdf"),
    pdf = await PDFDocument.create();
  try {
    for (let i = 0; i < source.countPages(); i++) {
      const page = source.loadPage(i);
      try {
        const bounds = page.getBounds(),
          width = bounds[2] - bounds[0],
          height = bounds[3] - bounds[1],
          scale = Math.min(dpi / 72, 10000 / Math.max(width, height));
        const image = page.toPixmap(
          mupdf.Matrix.scale(scale, scale),
          mupdf.ColorSpace.DeviceRGB,
          false,
          true,
        );
        try {
          const embedded = await pdf.embedPng(image.asPNG()),
            output = pdf.addPage([width, height]);
          output.drawImage(embedded, { x: 0, y: 0, width, height });
        } finally {
          image.destroy();
        }
      } finally {
        page.destroy();
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const now = new Date(Math.floor(Date.now() / 1000) * 1000),
      iso = now.toISOString();
    pdf.setTitle(title);
    pdf.setProducer("HayPDF");
    pdf.setCreator("HayPDF");
    pdf.setCreationDate(now);
    pdf.setModificationDate(now);
    const id = PDFHexString.of(crypto.randomUUID().replaceAll("-", ""));
    pdf.context.trailerInfo.ID = pdf.context.obj([id, id]);
    const profile = pdf.context.register(
      pdf.context.flateStream(await colorProfile(), { N: 3 }),
    );
    const intent = pdf.context.register(
      pdf.context.obj({
        Type: "OutputIntent",
        S: "GTS_PDFA1",
        OutputConditionIdentifier: PDFString.of("sRGB"),
        Info: PDFString.of("sRGB IEC61966-2.1"),
        DestOutputProfile: profile,
      }),
    );
    pdf.catalog.set(PDFName.of("OutputIntents"), pdf.context.obj([intent]));
    const xmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/" pdfaid:part="2" pdfaid:conformance="B"/><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escape(title)}</rdf:li></rdf:Alt></dc:title></rdf:Description><rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmp:CreatorTool="HayPDF" xmp:CreateDate="${iso}" xmp:ModifyDate="${iso}" xmp:MetadataDate="${iso}"/><rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/" pdf:Producer="HayPDF"/></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
    pdf.catalog.set(
      PDFName.of("Metadata"),
      pdf.context.register(
        pdf.context.stream(new TextEncoder().encode(xmp), {
          Type: "Metadata",
          Subtype: "XML",
        }),
      ),
    );
    return pdf.save();
  } finally {
    source.destroy();
  }
}
export function accessibleTranscript(
  texts: string[],
  title: string,
  language: string,
): string {
  return `<!doctype html><html lang="${escape(language)}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>${escape(title)}</title><style>body{font:18px/1.6 Arial,sans-serif;max-width:75ch;margin:3rem auto;padding:1rem}section{break-before:page}p{white-space:pre-wrap}</style></head><body><main><h1>${escape(title)}</h1>${texts.map((text, index) => `<section aria-label="Page ${index + 1}"><h2>Page ${index + 1}</h2><p>${escape(text)}</p></section>`).join("")}</main></body></html>`;
}
