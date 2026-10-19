const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  validatePdf: (bytes, flavour) =>
    ipcRenderer.invoke("pdf:validate", bytes, flavour),
  accessiblePdf: (html) => ipcRenderer.invoke("pdf:accessible", html),
  savePdf: (name, bytes) => ipcRenderer.invoke("pdf:save", name, bytes),
  saveFile: (name, bytes) => ipcRenderer.invoke("file:save", name, bytes),
  convertOffice: (name, bytes) =>
    ipcRenderer.invoke("office:convert", name, bytes),
});
