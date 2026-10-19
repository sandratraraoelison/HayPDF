import { useEffect, useState } from "react";
import { useEditor } from "../EditorContext";
import { useWorkbench } from "../WorkbenchContext";
import {
  inspectPdf,
  setAccessibility,
  setPrintBoxes,
  writeDocumentScript,
  moveStructureTag,
  type PdfAudit,
} from "../../infrastructure/pdfAnalysis";
import {
  createArchivalPdf,
  accessibleTranscript,
} from "../../infrastructure/pdfStandards";
import { exportDocument } from "../../infrastructure/pdfEngine";
import { exportPlainText } from "../../infrastructure/documentExports";
export function useAuditTools() {
  const { doc } = useEditor(),
    { execute, query:runQuery, modify, download } = useWorkbench();
  const [audit, setAudit] = useState<PdfAudit>(),
    [title, setTitle] = useState(""),
    [language, setLanguage] = useState("fr"),
    [alternatives, setAlternatives] = useState<
      { path: number[]; alt: string }[]
    >([]);
  const [inset, setInset] = useState(3),
    [bleed, setBleed] = useState(3),
    [dpi, setDpi] = useState(150),
    [validation, setValidation] = useState(""),
    [flavour, setFlavour] = useState("2b");
  const [scriptName, setScriptName] = useState("HayPDF"),
    [script, setScript] = useState("");
  useEffect(() => {
    let active = true;
    if (doc)
      void runQuery(async () => {
        const result = await inspectPdf(doc);
        if (active) {
          setAudit(result);
          setTitle(result.title || doc.name);
          setLanguage(result.language || "fr");
          setAlternatives(
            result.tags
              .filter((tag) => tag.role === "Figure")
              .map((tag) => ({ path: tag.path, alt: tag.alt })),
          );
        }
      });
    return () => {
      active = false;
    };
  }, [doc]);
  const saveMetadata = () =>
    modify((source) => setAccessibility(source, title, language, alternatives));
  const moveTag = (path: number[], direction: -1 | 1) =>
    modify(async (source) =>
      moveStructureTag(
        await setAccessibility(source, title, language, alternatives),
        path,
        direction,
      ),
    );
  const savePrintBoxes = () =>
    modify((source) => setPrintBoxes(source, inset, bleed));
  const saveScript = () =>
    modify((source) => writeDocumentScript(source, scriptName, script));
  const exportAudit = () =>
    execute(async () =>
      download(
        "pdf-inspection.json",
        new TextEncoder().encode(JSON.stringify(audit, null, 2)),
        "application/json",
      ),
    );
  const archive = () =>
    execute(async () => {
      if (!doc) return;
      const bytes = await createArchivalPdf(
        await exportDocument(doc),
        title,
        dpi,
      );
      if (window.desktop?.validatePdf) {
        const report = await window.desktop.validatePdf(bytes, "2b");
        setValidation(report);
        if (
          report &&
          !JSON.parse(report).report.jobs.every(
            (job: { validationResult: { compliant: boolean }[] }) =>
              job.validationResult.every((result) => result.compliant),
          )
        )
          throw new Error("ARCHIVE_VALIDATION_FAILED");
      }
      await download("archive-pdfa-2b.pdf", bytes, "application/pdf");
    });
  const validate = () =>
    execute(async () => {
      if (!window.desktop?.validatePdf || !doc)
        throw new Error("VERAPDF_REQUIRED");
      setValidation(
        await window.desktop.validatePdf(await exportDocument(doc), flavour),
      );
    });
  const exportTranscript = (pdf = false) =>
    execute(async () => {
      if (!doc) return;
      const text = await exportPlainText(
          doc,
          doc.pages.map((_, i) => i),
        ),
        html = accessibleTranscript(
          new TextDecoder().decode(text.bytes).split("\n\f\n"),
          title,
          language,
        );
      if (pdf) {
        if (!window.desktop?.accessiblePdf) throw new Error("DESKTOP_REQUIRED");
        await download(
          "accessible-transcript.pdf",
          await window.desktop.accessiblePdf(html),
          "application/pdf",
        );
      } else
        await download(
          "accessible-transcript.html",
          new TextEncoder().encode(html),
          "text/html",
        );
    });
  return {
    audit,
    title,
    setTitle,
    language,
    setLanguage,
    alternatives,
    setAlternatives,
    inset,
    setInset,
    bleed,
    setBleed,
    dpi,
    setDpi,
    validation,
    flavour,
    setFlavour,
    scriptName,
    setScriptName,
    script,
    setScript,
    saveMetadata,
    moveTag,
    savePrintBoxes,
    saveScript,
    exportAudit,
    archive,
    validate,
    exportTranscript,
  };
}
