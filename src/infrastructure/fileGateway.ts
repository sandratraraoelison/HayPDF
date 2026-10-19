declare global {
  interface Window {
    desktop?: {
      savePdf(name: string, bytes: Uint8Array): Promise<boolean>;
      saveFile(name: string, bytes: Uint8Array): Promise<boolean>;
      convertOffice(name: string, bytes: Uint8Array): Promise<Uint8Array>;
      validatePdf(bytes: Uint8Array, flavour: string): Promise<string>;
      accessiblePdf(html: string): Promise<Uint8Array>;
    };
  }
}
export async function savePdf(name: string, bytes: Uint8Array) {
  return saveFile(name, bytes, "application/pdf");
}
export async function saveFile(name: string, bytes: Uint8Array, mime: string) {
  if (window.desktop) return window.desktop.saveFile(name, bytes);
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], { type: mime }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
