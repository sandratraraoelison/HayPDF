import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { createArchivalPdf } from "../src/infrastructure/pdfStandards";
const root = fileURLToPath(new URL("../vendor/validation/", import.meta.url));
test(
  "archival output passes the actual bundled veraPDF PDF/A-2b validator",
  { skip: process.platform !== "win32" || !existsSync(root) },
  async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([400, 500]).drawText("Archive", { x: 40, y: 400 });
    pdf.addPage([500, 400]);
    const bytes = await createArchivalPdf(
      await pdf.save(),
      "Archive & conformité",
      72,
    );
    const { validatePdf } = createRequire(import.meta.url)(
      "../electron/pdfValidation.cjs",
    );
    const report = JSON.parse(
      await validatePdf(root + "verapdf", bytes, "2b", root + "java"),
    );
    assert.equal(report.report.jobs[0].validationResult[0].compliant, true);
    assert.equal(
      report.report.jobs[0].validationResult[0].details.failedChecks,
      0,
    );
  },
);
