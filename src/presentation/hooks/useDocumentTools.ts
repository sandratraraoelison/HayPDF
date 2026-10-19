import { useState } from "react";
import { type DocumentModel } from "../../domain/document";
import { duplicateDocumentPage } from "../../application/pageOperations";
import type { FormFieldModel } from "../../domain/formField";
import type {
  DocumentTool,
  DocumentToolOptions,
} from "../../application/documentTools";
import {
  createBlankPdf,
  createImagesPdf,
  exportPageImages,
  exportPlainText,
  splitDocument,
  type ExportFile,
} from "../../infrastructure/documentExports";
import { compressPdf, protectPdf } from "../../infrastructure/pdfSecurity";
import { exportDocument, readDocument } from "../../infrastructure/pdfEngine";
import { saveFile } from "../../infrastructure/fileGateway";
import { parsePageSelection } from "../../domain/pageSelection";
import { isOfficeExport } from "../../domain/conversion";
import {
  readFormFields,
  fillFormFields,
} from "../../infrastructure/formFields";

export function useDocumentTools({
  doc,
  pageIndex,
  commit,
  acceptCreated,
  run,
  setNotice,
  t,
}: {
  doc?: DocumentModel;
  pageIndex: number;
  commit: (doc: DocumentModel) => void;
  acceptCreated: (doc: DocumentModel) => void;
  run: (action: () => Promise<void>) => Promise<void>;
  setNotice: (text: string, tone?: "info" | "success") => void;
  t: (text: string) => string;
}) {
  const [documentTool, setTool] = useState<DocumentTool>();
  const [formFields, setFormFields] = useState<FormFieldModel[]>([]);
  function closeDocumentTool() {
    setTool(undefined);
  }
  async function openDocumentTool(tool: DocumentTool) {
    setNotice("");
    setFormFields([]);
    if (tool === "form-data" && doc) {
      await run(async () => {
        setFormFields(await readFormFields(await exportDocument(doc)));
        setTool(tool);
      });
    } else setTool(tool);
  }
  function duplicatePage() {
    if (!doc) return;
    commit(
      duplicateDocumentPage(doc, Math.min(pageIndex, doc.pages.length - 1)),
    );
    setNotice(t("Page dupliquée."), "success");
  }
  async function executeDocumentTool(options: DocumentToolOptions) {
    if (!documentTool) return;
    await run(async () => {
      let file: ExportFile | undefined;
      if (documentTool === "create") {
        let next: DocumentModel;
        if (options.createMode === "blank")
          next = await createBlankPdf(
            "document.pdf",
            options.width,
            options.height,
          );
        else {
          if (
            options.files.some((file) => !/^image\/(png|jpeg)$/.test(file.type))
          )
            throw new Error("INVALID_IMAGE_TYPE");
          if (
            options.files.reduce((sum, file) => sum + file.size, 0) >
            100 * 1024 * 1024
          )
            throw new Error("IMAGES_TOO_LARGE");
          const images = await Promise.all(
            options.files.map(async (file) => ({
              bytes: new Uint8Array(await file.arrayBuffer()),
              type:
                file.type === "image/png"
                  ? ("png" as const)
                  : ("jpeg" as const),
            })),
          );
          next = await createImagesPdf(images);
        }
        acceptCreated(next);
      } else if (documentTool === "office") {
        const source = options.files[0];
        if (!source) throw new Error("NO_OFFICE_FILE");
        if (!window.desktop) throw new Error("DESKTOP_REQUIRED");
        if (source.size > 100 * 1024 * 1024)
          throw new Error("IMAGES_TOO_LARGE");
        const bytes = await window.desktop.convertOffice(
          source.name,
          new Uint8Array(await source.arrayBuffer()),
        );
        acceptCreated(
          await readDocument(bytes, source.name.replace(/\.[^.]+$/, ".pdf")),
        );
      } else {
        if (!doc) return;
        const name = doc.name.replace(/\.pdf$/i, "");
        if (documentTool === "export") {
          const indices = parsePageSelection(options.ranges, doc.pages.length);
          if (isOfficeExport(options.format)) {
            const { exportOfficeDocument } =
              await import("../../infrastructure/officeExport");
            file = await exportOfficeDocument(
              doc,
              indices,
              options.format,
              options.recognition,
            );
          } else {
            file =
              options.format === "pdf"
                ? {
                    name: `${name}-export.pdf`,
                    mime: "application/pdf",
                    bytes: await exportDocument(
                      doc,
                      indices.map((index) => doc.pages[index]),
                    ),
                  }
                : options.format === "text"
                  ? await exportPlainText(doc, indices)
                  : await exportPageImages(
                      doc,
                      indices,
                      options.format,
                      options.dpi,
                    );
          }
        } else if (documentTool === "split")
          file = await splitDocument(doc, options.ranges);
        else if (documentTool === "protect") {
          if (options.password !== options.confirmPassword)
            throw new Error("PASSWORD_MISMATCH");
          file = {
            name: `${name}-protected.pdf`,
            mime: "application/pdf",
            bytes: protectPdf(await exportDocument(doc), options.password),
          };
        } else if (documentTool === "compress") {
          const original = await exportDocument(doc),
            bytes = compressPdf(original);
          file = {
            name: `${name}-compressed.pdf`,
            mime: "application/pdf",
            bytes,
          };
          if (await saveFile(file.name, file.bytes, file.mime)) {
            setTool(undefined);
            setNotice(
              `${t("Compression sans perte terminée.")} ${original.length.toLocaleString()} → ${bytes.length.toLocaleString()} ${t("octets")}.`,
              "success",
            );
          }
          return;
        } else {
          if (options.formAction === "json")
            file = {
              name: `${name}-form.json`,
              mime: "application/json",
              bytes: new TextEncoder().encode(
                JSON.stringify(options.values, null, 2),
              ),
            };
          else {
            const bytes = await fillFormFields(
              await exportDocument(doc),
              options.values,
              options.formAction === "flatten",
            );
            if (options.formAction === "flatten")
              file = {
                name: `${name}-flattened.pdf`,
                mime: "application/pdf",
                bytes,
              };
            else commit(await readDocument(bytes, doc.name));
          }
        }
      }
      if (file && !(await saveFile(file.name, file.bytes, file.mime))) return;
      setTool(undefined);
      setNotice(
        t(file ? "Export terminé." : "Modification appliquée."),
        "success",
      );
    });
  }
  return {
    documentTool,
    openDocumentTool,
    closeDocumentTool,
    executeDocumentTool,
    formFields,
    duplicatePage,
  };
}
