const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  shell,
} = require("electron");
const contactUrl = `mailto:${require("../package.json").author.email}`;
const path = require("node:path");
const fs = require("node:fs/promises");
const { convertOffice } = require("./officeConverter.cjs");
const { validatePdf } = require("./pdfValidation.cjs");
const { accessiblePdf } = require("./accessiblePdf.cjs");
let window;
app.whenReady().then(() => {
  // The editor handles document shortcuts; retain the system application menu on macOS.
  Menu.setApplicationMenu(
    process.platform === "darwin"
      ? Menu.buildFromTemplate([{ role: "appMenu" }])
      : null,
  );
  const saveFile = async (event, name, bytes) => {
    if (
      event.sender !== window.webContents ||
      typeof name !== "string" ||
      !(bytes instanceof Uint8Array) ||
      bytes.length > 250 * 1024 * 1024
    )
      throw new Error("Requête invalide");
    const extension = path.extname(name).slice(1).toLowerCase();
    const result = await dialog.showSaveDialog(window, {
      defaultPath: path.basename(name),
      filters: extension
        ? [{ name: extension.toUpperCase(), extensions: [extension] }]
        : [{ name: "Files", extensions: ["*"] }],
    });
    if (result.canceled || !result.filePath) return false;
    await fs.writeFile(result.filePath, bytes);
    return true;
  };
  ipcMain.handle("pdf:save", saveFile);
  ipcMain.handle("file:save", saveFile);
  let validatorRoot;
  const bundledValidation = app.isPackaged
    ? path.join(process.resourcesPath, "validation")
    : path.join(__dirname, "../vendor/validation");
  ipcMain.handle("pdf:validate", async (event, bytes, flavour) => {
    if (
      event.sender !== window.webContents ||
      !(bytes instanceof Uint8Array) ||
      bytes.length > 250 * 1024 * 1024
    )
      throw new Error("Requête invalide");
    if (!validatorRoot) {
      try {
        if (process.platform !== "win32" || process.arch !== "x64")
          throw new Error("External runtime required");
        await fs.access(path.join(bundledValidation, "verapdf", "bin"));
        validatorRoot = path.join(bundledValidation, "verapdf");
      } catch {}
    }
    if (!validatorRoot) {
      const selection = await dialog.showOpenDialog(window, {
        title: "veraPDF",
        properties: ["openDirectory"],
      });
      if (selection.canceled) return "";
      validatorRoot = selection.filePaths[0];
    }
    try {
      return await validatePdf(
        validatorRoot,
        bytes,
        flavour,
        validatorRoot === path.join(bundledValidation, "verapdf")
          ? path.join(bundledValidation, "java")
          : undefined,
      );
    } catch (error) {
      validatorRoot = undefined;
      throw error;
    }
  });
  ipcMain.handle("pdf:accessible", async (event, html) => {
    if (
      event.sender !== window.webContents ||
      typeof html !== "string" ||
      html.length > 50 * 1024 * 1024
    )
      throw new Error("Requête invalide");
    return accessiblePdf(html);
  });
  let converting = false;
  ipcMain.handle("office:convert", async (event, name, bytes) => {
    if (
      event.sender !== window.webContents ||
      typeof name !== "string" ||
      !(bytes instanceof Uint8Array) ||
      bytes.length > 100 * 1024 * 1024 ||
      converting
    )
      throw new Error("Requête invalide");
    converting = true;
    try {
      return await convertOffice(name, bytes);
    } finally {
      converting = false;
    }
  });
  const createWindow = () => {
    window = new BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: 1000,
      minHeight: 700,
      backgroundColor: "#19171f",
      icon: path.join(__dirname, "icon.png"),
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });
    window.webContents.setWindowOpenHandler(({ url }) => {
      if (url === contactUrl) void shell.openExternal(url).catch(console.error);
      return { action: "deny" };
    });
    window.webContents.on("will-navigate", (event) => event.preventDefault());
    if (!app.isPackaged && process.env.HAYPDF_DEV === "1")
      window.loadURL("http://127.0.0.1:5173");
    else window.loadFile(path.join(__dirname, "../dist/index.html"));
  };
  createWindow();
  app.on("activate", () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
