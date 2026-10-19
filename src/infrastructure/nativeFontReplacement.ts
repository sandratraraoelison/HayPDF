import type * as MuPDF from "mupdf";
import type { Mark, NativeText } from "../domain/document";
import { loadMatchingFullFont } from "./bundledFonts";
import { NativeFontError } from "../domain/NativeFontError";
type Glyph = {
  font: MuPDF.Font;
  matrix: MuPDF.Matrix;
  glyph: number;
  unicode: number;
};
const number = (value: number) => Number(value.toFixed(7)).toString();
const unicodeHex = (code: number) =>
  code <= 0xffff
    ? code.toString(16).padStart(4, "0")
    : (() => {
        const n = code - 0x10000;
        return (
          (0xd800 + (n >> 10)).toString(16) + (0xdc00 + (n & 1023)).toString(16)
        );
      })();

/** Re-embed the original font program, retaining the actual text matrix and glyph spacing. */
export async function replaceWithOriginalFont(
  bytes: Uint8Array,
  pageIndex: number,
  block: NativeText,
  replacement: string,
  style: Pick<Mark, "size" | "color">,
  options: { fontData?: Uint8Array } = {},
): Promise<Uint8Array> {
  const mupdf = await import("mupdf");
  const doc = mupdf.Document.openDocument(bytes, "application/pdf").asPDF();
  if (!doc) throw new Error("Invalid PDF");
  const heldFonts = new Map<number, MuPDF.Font>();
  try {
    const page = doc.loadPage(pageIndex);
    if (!(page instanceof mupdf.PDFPage)) {
      page.destroy();
      throw new Error("Invalid page");
    }
    try {
      const [offsetX, offsetY] = page.getBounds();
      const baseline = block.y + (block.baselineOffset ?? block.size) + offsetY;
      const glyphs: Glyph[] = [];
      const device = new mupdf.Device({
        fillText(text, ctm) {
          text.walk({
            showGlyph(font, trm, glyph, unicode) {
              const matrix = mupdf.Matrix.concat(trm, ctm);
              const inLine =
                block.baselineOffset === undefined
                  ? matrix[5] >= block.y + offsetY &&
                    matrix[5] <= block.y + offsetY + block.height
                  : Math.abs(matrix[5] - baseline) <= 0.6;
              if (
                glyph < 0 ||
                unicode < 0 ||
                !inLine ||
                matrix[4] < block.x + offsetX - 0.6 ||
                matrix[4] > block.x + offsetX + block.width - 0.05 ||
                (block.fontName && font.getName() !== block.fontName)
              )
                return;
              let kept = heldFonts.get(font.pointer);
              if (!kept) {
                kept = new mupdf.Font(font.pointer);
                heldFonts.set(font.pointer, kept);
              }
              glyphs.push({ font: kept, matrix, glyph, unicode });
            },
          });
        },
      });
      try {
        page.runPageContents(device, mupdf.Matrix.identity);
        device.close();
      } finally {
        device.destroy();
      }
      glyphs.sort((a, b) => a.matrix[4] - b.matrix[4]);
      const first = glyphs[0];
      if (!first && replacement)
        throw new NativeFontError(
          "NATIVE_FONT_UNAVAILABLE",
          block.fontName ?? "Unknown",
        );
      let stream = "";
      const embeddedFonts = new Map<MuPDF.Font, MuPDF.PDFObject>();
      if (first && replacement) {
        const font = first.font;
        const scale = style.size / block.size;
        const base: MuPDF.Matrix = [...first.matrix];
        // Preserve source horizontal scaling; only an explicit size change scales it.
        for (let i = 0; i < 4; i++) base[i] *= scale;
        const advances = glyphs
          .slice(0, -1)
          .flatMap((g, i) =>
            g.unicode === 32
              ? []
              : [
                  glyphs[i + 1].matrix[4] -
                    g.matrix[4] -
                    g.font.advanceGlyph(g.glyph) * g.matrix[0],
                ],
          )
          .sort((a, b) => a - b);
        const spacing =
          (advances.length ? advances[Math.floor(advances.length / 2)] : 0) *
          scale;
        const chars = Array.from(replacement);
        const sourceMap = new Map(glyphs.map((g) => [g.unicode, g.glyph]));
        let fullFont: MuPDF.Font | undefined;
        const missing = chars.some((char) => {
          const code = char.codePointAt(0)!;
          return !(sourceMap.get(code) ?? font.encodeCharacter(code));
        });
        if (missing) {
          try {
            fullFont = options.fontData
              ? new mupdf.Font("User replacement font", options.fontData)
              : await loadMatchingFullFont(font);
          } catch (cause) {
            throw new NativeFontError(
              "NATIVE_FONT_UNAVAILABLE",
              font.getName(),
              [],
              cause,
            );
          }
          if (fullFont) heldFonts.set(fullFont.pointer, fullFont);
        }
        const missingCharacters = [
          ...new Set(
            chars.filter((char) => {
              const code = char.codePointAt(0)!;
              return (
                !(sourceMap.get(code) ?? font.encodeCharacter(code)) &&
                !fullFont?.encodeCharacter(code)
              );
            }),
          ),
        ];
        if (missingCharacters.length)
          throw new NativeFontError(
            "NATIVE_FONT_MISSING_GLYPH",
            font.getName(),
            missingCharacters,
          );
        const encoded = chars.map((char) => {
          const code = char.codePointAt(0)!;
          let glyph = sourceMap.get(code) ?? font.encodeCharacter(code);
          let glyphFont = font;
          if (!glyph && fullFont) {
            glyph = fullFont.encodeCharacter(code);
            glyphFont = fullFont;
          }
          if (!glyph) throw new Error("NATIVE_FONT_MISSING_GLYPH");
          return { code, glyph, font: glyphFont };
        });
        const sourceChars = Array.from(block.text);
        let prefix = 0;
        while (
          prefix < chars.length &&
          prefix < sourceChars.length &&
          chars[prefix] === sourceChars[prefix]
        )
          prefix++;
        let cursor = base[4];
        const matrices = encoded.map((item, i) => {
          const matrix: MuPDF.Matrix = [...base];
          // Existing prefix keeps its source kerning and character placement exactly.
          if (i < prefix && glyphs[i]?.unicode === item.code)
            cursor = base[4] + (glyphs[i].matrix[4] - first.matrix[4]) * scale;
          matrix[4] = cursor;
          cursor += item.font.advanceGlyph(item.glyph) * base[0] + spacing;
          return matrix;
        });
        if (
          cursor >
          block.x + offsetX + (block.availableWidth ?? block.width) + 0.5
        )
          throw new Error("NATIVE_TEXT_OVERFLOW");
        for (const usedFont of new Set(encoded.map((item) => item.font))) {
          let embedded: MuPDF.PDFObject;
          try {
            embedded = doc.addFont(usedFont);
          } catch (cause) {
            throw new NativeFontError(
              "NATIVE_FONT_UNAVAILABLE",
              usedFont.getName(),
              [],
              cause,
            );
          }
          const mappings = [
            ...new Map(
              encoded
                .filter((item) => item.font === usedFont)
                .map((g) => [g.glyph, g.code]),
            ),
          ];
          const cmap = [
            "/CIDInit /ProcSet findresource begin",
            "12 dict begin",
            "begincmap",
            "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
            "/CMapName /HayPDFUnicode def",
            "/CMapType 2 def",
            "1 begincodespacerange",
            "<0000> <FFFF>",
            "endcodespacerange",
          ];
          for (let i = 0; i < mappings.length; i += 100) {
            const batch = mappings.slice(i, i + 100);
            cmap.push(
              `${batch.length} beginbfchar`,
              ...batch.map(
                ([g, c]) =>
                  `<${g.toString(16).padStart(4, "0")}> <${unicodeHex(c)}>`,
              ),
              "endbfchar",
            );
          }
          cmap.push(
            "endcmap",
            "CMapName currentdict /CMap defineresource pop",
            "end",
            "end",
          );
          embedded.put("ToUnicode", doc.addStream(cmap.join("\n"), {}));
          embeddedFonts.set(usedFont, embedded);
        }
        const inverse = mupdf.Matrix.invert(page.getTransform());
        const color = [1, 3, 5]
          .map(
            (start) => parseInt(style.color.slice(start, start + 2), 16) / 255,
          )
          .map(number)
          .join(" ");
        stream = `q\n${color} rg\nBT\n`;
        const fontKeys = [...embeddedFonts.keys()];
        encoded.forEach((item, i) => {
          const matrix = mupdf.Matrix.concat(matrices[i], inverse);
          stream += `/HayPDFReplacement${fontKeys.indexOf(item.font)} 1 Tf\n${matrix.map(number).join(" ")} Tm <${item.glyph.toString(16).padStart(4, "0")}> Tj\n`;
        });
        stream += "ET\nQ";
      }
      const redact = page.createAnnotation("Redact");
      try {
        redact.setRect([
          block.x + offsetX,
          block.y + offsetY,
          block.x + offsetX + block.width,
          block.y + offsetY + block.height,
        ]);
        redact.update();
        redact.applyRedaction(
          0,
          mupdf.PDFPage.REDACT_IMAGE_NONE,
          mupdf.PDFPage.REDACT_LINE_ART_NONE,
          mupdf.PDFPage.REDACT_TEXT_REMOVE,
        );
      } finally {
        redact.destroy();
      }
      if (embeddedFonts.size) {
        const object = page.getObject(),
          resources = doc.newDictionary(),
          fonts = doc.newDictionary();
        const current = object.getInheritable("Resources");
        current.forEach((value, key) => resources.put(key, value));
        current.get("Font").forEach((value, key) => fonts.put(key, value));
        // Choose a fresh resource name so a second edit cannot overwrite earlier text.
        let index = 0;
        for (const embedded of embeddedFonts.values()) {
          let name = "HayPDFOriginal",
            suffix = 0;
          while (!fonts.get(name).isNull()) name = `HayPDFOriginal${++suffix}`;
          fonts.put(name, embedded);
          stream = stream.replaceAll(
            `/HayPDFReplacement${index++} `,
            `/${name} `,
          );
        }
        resources.put("Font", fonts);
        object.put("Resources", resources);
        const contents = doc.newArray(),
          previous = object.get("Contents");
        const saveState = doc.addStream("q\n", {}),
          restoreState = doc.addStream("\nQ\n", {});
        contents.push(saveState);
        if (previous.isArray())
          previous.forEach((value) => contents.push(value));
        else if (!previous.isNull()) contents.push(previous);
        contents.push(restoreState);
        contents.push(doc.addStream(stream, {}));
        object.put("Contents", contents);
      }
      const result = doc.saveToBuffer("garbage=4,compress");
      try {
        return result.asUint8Array().slice();
      } finally {
        result.destroy();
      }
    } finally {
      page.destroy();
    }
  } finally {
    for (const font of heldFonts.values()) font.destroy();
    doc.destroy();
  }
}
