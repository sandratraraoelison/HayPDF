const fs = require("node:fs/promises"),
  path = require("node:path"),
  { createHash } = require("node:crypto"),
  { execFile } = require("node:child_process"),
  { promisify } = require("node:util");
const execute = promisify(execFile),
  root = path.resolve(__dirname, ".."),
  vendor = path.join(root, "vendor", "validation"),
  cache = path.join(root, "tmp", "validation-tools");
const runtime = {
  url: "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jre_x64_windows_hotspot_21.0.12.1_1.zip",
  sha256: "d35f31e712f0fcf6ac5a093edc90204fbff22f720ba3950bd09d331d5e621636",
};
const validator = {
  url: "https://software.verapdf.org/releases/1.28/verapdf-greenfield-1.28.2-installer.zip",
  sha256: "d1693a5f0bf0997180f6d97e8a5568b0cf39e27eee338d439c8adb58435c1e89",
};
async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
async function download(asset, name) {
  const target = path.join(cache, name);
  if (await fileExists(target)) {
    const data = await fs.readFile(target);
    if (createHash("sha256").update(data).digest("hex") === asset.sha256)
      return target;
  }
  const response = await fetch(asset.url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(data).digest("hex") !== asset.sha256)
    throw new Error("Tool checksum mismatch");
  await fs.writeFile(target, data);
  return target;
}
async function unpack(zip, directory) {
  await execute(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      path.join(__dirname, "extract-zip.ps1"),
      "-Archive",
      zip,
      "-Destination",
      directory,
    ],
    { windowsHide: true },
  );
}
async function prepare() {
  if (process.platform !== "win32" || process.arch !== "x64") {
    console.log(
      "Bundled validation is available for Windows x64; other platforms can use local Java and veraPDF.",
    );
    return;
  }
  if (
    (await fileExists(path.join(vendor, "java", "bin", "java.exe"))) &&
    (await fileExists(
      path.join(vendor, "verapdf", "bin", "greenfield-apps-1.28.2.jar"),
    ))
  )
    return;
  await fs.mkdir(cache, { recursive: true });
  await fs.mkdir(vendor, { recursive: true });
  const [javaZip, veraZip] = await Promise.all([
    download(runtime, "jre.zip"),
    download(validator, "verapdf.zip"),
  ]);
  const javaExtract = path.join(cache, "jre"),
    veraExtract = path.join(cache, "installer");
  await unpack(javaZip, javaExtract);
  await unpack(veraZip, veraExtract);
  const [runtimeFolder] = (
    await fs.readdir(javaExtract, { withFileTypes: true })
  ).filter((entry) => entry.isDirectory());
  await fs.cp(
    path.join(javaExtract, runtimeFolder.name),
    path.join(vendor, "java"),
    { recursive: true },
  );
  const destination = path.join(vendor, "verapdf"),
    xml = `<AutomatedInstallation langpack="eng"><com.izforge.izpack.panels.htmlhello.HTMLHelloPanel id="welcome"/><com.izforge.izpack.panels.target.TargetPanel id="install_dir"><installpath>${destination.replaceAll("&", "&amp;")}</installpath></com.izforge.izpack.panels.target.TargetPanel><com.izforge.izpack.panels.packs.PacksPanel id="sdk_pack_select"><pack index="0" name="veraPDF GUI" selected="true"/><pack index="1" name="veraPDF CLI" selected="true"/></com.izforge.izpack.panels.packs.PacksPanel><com.izforge.izpack.panels.install.InstallPanel id="install"/><com.izforge.izpack.panels.finish.FinishPanel id="finish"/></AutomatedInstallation>`;
  const configuration = path.join(cache, "install-bundled.xml");
  await fs.writeFile(configuration, xml);
  await execute(
    path.join(vendor, "java", "bin", "java.exe"),
    [
      "-jar",
      path.join(
        veraExtract,
        "verapdf-greenfield-1.28.2",
        "verapdf-izpack-installer-1.28.2.jar",
      ),
      configuration,
    ],
    { windowsHide: true },
  );
  await fs.writeFile(
    path.join(vendor, "SOURCES.json"),
    JSON.stringify(
      {
        runtime,
        validator,
        licenses:
          "Temurin: GPLv2 with Classpath Exception; veraPDF: MPLv2 or GPLv3+. License notices remain in the respective tool folders.",
      },
      null,
      2,
    ),
  );
  console.log("Local PDF validator prepared.");
}
prepare().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
