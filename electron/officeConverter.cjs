const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { pathToFileURL } = require("node:url");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const execute = promisify(execFile);

async function findLibreOffice() {
  const candidates =
    process.platform === "win32"
      ? [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]]
          .filter(Boolean)
          .map((root) =>
            path.join(root, "LibreOffice", "program", "soffice.exe"),
          )
      : process.platform === "darwin"
        ? ["/Applications/LibreOffice.app/Contents/MacOS/soffice"]
        : ["/usr/bin/libreoffice", "/usr/local/bin/libreoffice"];
  for (const candidate of candidates)
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  throw new Error("LIBREOFFICE_NOT_FOUND");
}
async function convertOffice(name, bytes) {
  const extension = path.extname(name).toLowerCase();
  if (
    ![
      ".doc",
      ".docx",
      ".odt",
      ".xls",
      ".xlsx",
      ".ods",
      ".ppt",
      ".pptx",
      ".odp",
      ".rtf",
    ].includes(extension)
  )
    throw new Error("UNSUPPORTED_OFFICE_FORMAT");
  const executable = await findLibreOffice();
  const temporaryRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "haypdf-office-"),
  );
  try {
    const input = path.join(temporaryRoot, "document" + extension);
    await fs.writeFile(input, bytes);
    await execute(
      executable,
      [
        `-env:UserInstallation=${pathToFileURL(path.join(temporaryRoot, "profile")).href}`,
        "--headless",
        "--nologo",
        "--nodefault",
        "--norestore",
        "--convert-to",
        "pdf",
        "--outdir",
        temporaryRoot,
        input,
      ],
      { timeout: 120000, windowsHide: true, maxBuffer: 1024 * 1024 },
    );
    const output = await fs.readFile(path.join(temporaryRoot, "document.pdf"));
    if (output.length > 250 * 1024 * 1024) throw new Error("EXPORT_TOO_LARGE");
    return new Uint8Array(output);
  } finally {
    // mkdtemp creates this exact target. Check its location before recursive cleanup.
    const resolved = path.resolve(temporaryRoot);
    if (
      path.dirname(resolved) === path.resolve(os.tmpdir()) &&
      path.basename(resolved).startsWith("haypdf-office-")
    )
      await fs.rm(resolved, { recursive: true, force: true });
  }
}
module.exports = { convertOffice, findLibreOffice };
