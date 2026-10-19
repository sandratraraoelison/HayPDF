const path = require("node:path"),
  os = require("node:os"),
  fs = require("node:fs/promises"),
  { execFile } = require("node:child_process"),
  { promisify } = require("node:util");
const execute = promisify(execFile);
async function validatePdf(root, bytes, flavour, javaRoot) {
  if (!["1b", "2b", "ua1", "ua2"].includes(flavour))
    throw new Error("INVALID_VALIDATION_PROFILE");
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "haypdf-validate-"));
  try {
    const filename = path.join(folder, "document.pdf");
    await fs.writeFile(filename, bytes);
    const classpath = [
      path.join(root, "etc"),
      path.join(root, "bin", "*"),
      path.join(root, "lib", "*"),
      path.join(root, "*"),
    ].join(path.delimiter);
    const selectedJava = javaRoot ?? process.env.JAVA_HOME;
    const java = selectedJava
      ? path.join(
          selectedJava,
          "bin",
          process.platform === "win32" ? "java.exe" : "java",
        )
      : "java";
    const args = [
      "-cp",
      classpath,
      `-Dapp.home=${root}`,
      `-Dapp.repo=${path.join(root, "bin")}`,
      "org.verapdf.apps.GreenfieldCliWrapper",
      "--format",
      "json",
      "--flavour",
      flavour,
      "--maxfailuresdisplayed",
      "-1",
      filename,
    ];
    try {
      return (
        await execute(java, args, {
          windowsHide: true,
          timeout: 180000,
          maxBuffer: 50 * 1024 * 1024,
        })
      ).stdout;
    } catch (error) {
      if (error.stdout?.trim().startsWith("{")) return error.stdout;
      throw new Error("VERAPDF_REQUIRED", { cause: error });
    }
  } finally {
    const resolved = path.resolve(folder);
    if (
      path.dirname(resolved) === path.resolve(os.tmpdir()) &&
      path.basename(resolved).startsWith("haypdf-validate-")
    )
      await fs.rm(resolved, { recursive: true, force: true });
  }
}
module.exports = { validatePdf };
