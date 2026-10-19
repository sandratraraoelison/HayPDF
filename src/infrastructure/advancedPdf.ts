import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { exportDocument, readDocument } from "./pdfEngine";
import type { DocumentModel } from "../domain/document";

export type AdvancedAction =
  "blank" | "header" | "watermark" | "link" | "redact" | "form";
export interface AdvancedOptions {
  text: string;
  footer: string;
  allPages: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  formType?: "text" | "checkbox" | "dropdown" | "radio" | "list";
  fieldName?: string;
  choices?: string;
  required?: boolean;
  checked?: boolean;
}

/** Bake a single operation into a fresh source, leaving history snapshots intact. */
export async function applyAdvancedPdf(
  doc: DocumentModel,
  index: number,
  action: AdvancedAction,
  options: AdvancedOptions,
): Promise<DocumentModel> {
  if (
    ["link", "redact", "form"].includes(action) &&
    (!Number.isFinite(options.x + options.y + options.width + options.height) ||
      options.x < 0 ||
      options.y < 0 ||
      options.width <= 0 ||
      options.height <= 0)
  )
    throw new Error("Zone invalide / Invalid area");
  const bytes = await exportDocument(doc);
  if (action === "redact") {
    const mupdf = await import("mupdf");
    const source = mupdf.Document.openDocument(
      bytes,
      "application/pdf",
    ).asPDF()!;
    try {
      const page = source.loadPage(index);
      if (!(page instanceof mupdf.PDFPage)) {
        page.destroy();
        throw new Error("Invalid PDF page");
      }
      try {
        const annotation = page.createAnnotation("Redact");
        try {
          const [ox, oy] = page.getBounds();
          const bounds = page.getBounds();
          if (
            options.x + options.width > bounds[2] - bounds[0] ||
            options.y + options.height > bounds[3] - bounds[1]
          )
            throw new Error("Zone hors de la page / Area outside page");
          annotation.setRect([
            ox + options.x,
            oy + options.y,
            ox + options.x + options.width,
            oy + options.y + options.height,
          ]);
          annotation.update();
          annotation.applyRedaction(
            1,
            mupdf.PDFPage.REDACT_IMAGE_PIXELS,
            mupdf.PDFPage.REDACT_LINE_ART_REMOVE_IF_TOUCHED,
            mupdf.PDFPage.REDACT_TEXT_REMOVE,
          );
        } finally {
          annotation.destroy();
        }
        const buffer = source.saveToBuffer("garbage=4,compress");
        try {
          return await readDocument(buffer.asUint8Array().slice(), doc.name);
        } finally {
          buffer.destroy();
        }
      } finally {
        page.destroy();
      }
    } finally {
      source.destroy();
    }
  }
  const pdf = await PDFDocument.load(bytes);
  const selected = pdf.getPage(index);
  if (action === "blank") {
    const { width, height } = selected.getSize();
    pdf.insertPage(index + 1, [width, height]);
  } else {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const targets =
      options.allPages && (action === "header" || action === "watermark")
        ? pdf.getPages()
        : [selected];
    for (const page of targets) {
      // Page-space transformation maps viewer coordinates, including rotated crop boxes.
      const { x: ox, y: oy, width: w, height: h } = page.getCropBox();
      const rotation = ((page.getRotation().angle % 360) + 360) % 360;
      const vw = rotation % 180 ? h : w,
        vh = rotation % 180 ? w : h;
      const point = (x: number, y: number): [number, number] =>
        rotation === 90
          ? [ox + y, oy + x]
          : rotation === 180
            ? [ox + w - x, oy + y]
            : rotation === 270
              ? [ox + w - y, oy + h - x]
              : [ox + x, oy + h - y];
      if (action === "header" || action === "watermark") {
        const { degrees } = await import("pdf-lib");
        const draw = (text: string, y: number, size: number, opacity = 1) => {
          const expanded = text
            .replaceAll("{page}", String(pdf.getPages().indexOf(page) + 1))
            .replaceAll("{pages}", String(pdf.getPageCount()));
          const tw = font.widthOfTextAtSize(expanded, size);
          if (tw > vw - 40)
            throw new Error(
              "Le texte dépasse la largeur de la page / Text exceeds page width",
            );
          const [x, py] = point((vw - tw) / 2, y);
          page.drawText(expanded, {
            x,
            y: py,
            size,
            font,
            rotate: degrees(rotation),
            opacity,
            color: rgb(0.35, 0.35, 0.35),
          });
        };
        if (action === "header") {
          draw(options.text, 28, 11);
          draw(options.footer, vh - 22, 11);
        } else draw(options.text, vh / 2, 40, 0.2);
      } else {
        if (
          options.x < 0 ||
          options.y < 0 ||
          options.x + options.width > vw ||
          options.y + options.height > vh
        )
          throw new Error("Zone hors de la page / Area outside page");
        const corners = [
          point(options.x, options.y),
          point(options.x + options.width, options.y + options.height),
        ];
        const x = Math.min(...corners.map((p) => p[0])),
          y = Math.min(...corners.map((p) => p[1]));
        const width = Math.abs(corners[1][0] - corners[0][0]),
          height = Math.abs(corners[1][1] - corners[0][1]);
        if (action === "link") {
          const url = new URL(options.text);
          if (!["https:", "http:"].includes(url.protocol))
            throw new Error("URL HTTP(S) requise / HTTP(S) URL required");
          const annotation = pdf.context.register(
            pdf.context.obj({
              Type: "Annot",
              Subtype: "Link",
              Rect: [x, y, x + width, y + height],
              Border: [0, 0, 1],
              C: [0.35, 0.25, 0.8],
              A: {
                S: "URI",
                URI: (await import("pdf-lib")).PDFString.of(url.href),
              },
            }),
          );
          page.node.addAnnot(annotation);
        } else {
          const form = pdf.getForm(),
            name = options.fieldName?.trim() || `field_${crypto.randomUUID()}`;
          const appearance = { x, y, width, height, font, borderWidth: 1 };
          const choices = [
            ...new Set(
              (options.choices ?? "")
                .split("\n")
                .map((v) => v.trim())
                .filter(Boolean),
            ),
          ];
          if (
            options.formType &&
            ["dropdown", "radio", "list"].includes(options.formType) &&
            !choices.length
          )
            throw new Error("FORM_CHOICES_REQUIRED");
          let field;
          switch (options.formType ?? "text") {
            case "checkbox": {
              const box = form.createCheckBox(name);
              box.addToPage(page, appearance);
              if (options.checked) box.check();
              field = box;
              break;
            }
            case "dropdown": {
              const dropdown = form.createDropdown(name);
              dropdown.addOptions(choices);
              dropdown.select(choices[0]);
              dropdown.addToPage(page, appearance);
              field = dropdown;
              break;
            }
            case "list": {
              const list = form.createOptionList(name);
              list.addOptions(choices);
              list.enableMultiselect();
              list.addToPage(page, appearance);
              field = list;
              break;
            }
            case "radio": {
              const group = form.createRadioGroup(name);
              if (height / choices.length < 12)
                throw new Error("FORM_AREA_TOO_SMALL");
              choices.forEach((choice, i) => {
                if (font.widthOfTextAtSize(choice, 11) > width - 24)
                  throw new Error("FORM_AREA_TOO_SMALL");
                const rowY = y + height - ((i + 1) * height) / choices.length;
                group.addOptionToPage(choice, page, {
                  ...appearance,
                  y: rowY,
                  width: 18,
                  height: 18,
                });
                page.drawText(choice, {
                  x: x + 24,
                  y: rowY + 4,
                  size: 11,
                  font,
                });
              });
              field = group;
              break;
            }
            default: {
              const textField = form.createTextField(name);
              textField.setText(options.text);
              textField.addToPage(page, appearance);
              field = textField;
            }
          }
          if (options.required) field.enableRequired();
        }
      }
    }
  }
  return readDocument(await pdf.save(), doc.name);
}
