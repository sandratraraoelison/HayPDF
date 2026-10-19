const { BrowserWindow } = require("electron");
async function accessiblePdf(html) {
  const preview = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true,
      partition: `haypdf-transcript-${Date.now()}`,
    },
  });
  preview.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  preview.webContents.on("will-navigate", (e) => e.preventDefault());
  preview.webContents.session.webRequest.onBeforeRequest((details, callback) =>
    callback({ cancel: !details.url.startsWith("data:") }),
  );
  try {
    await preview.loadURL(
      "data:text/html;charset=utf-8," + encodeURIComponent(html),
    );
    return new Uint8Array(
      await preview.webContents.printToPDF({
        printBackground: true,
        generateTaggedPDF: true,
      }),
    );
  } finally {
    preview.destroy();
  }
}
module.exports = { accessiblePdf };
