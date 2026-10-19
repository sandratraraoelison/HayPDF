const { app, BrowserWindow, Menu } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const profile = path.join(__dirname, "../tmp/smoke-profile");
require("node:fs").mkdirSync(profile, { recursive: true });
app.setPath("userData", profile);
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  const window = new BrowserWindow({
    show: false,
    width: 1440,
    height: 960,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      offscreen: true,
    },
  });
  const errors = [];
  window.webContents.on("console-message", (event) => {
    if (event.level === "error") {
      errors.push(event.message);
      console.error("Renderer:", event.message);
    }
  });
  try {
    await window.loadFile(path.join(__dirname, "../dist/index.html"));
    await window.webContents.executeJavaScript(`localStorage.clear()`);
    await window.reload();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const result = await window.webContents.executeJavaScript(
      `({ title: document.title, heading: document.querySelector('h1')?.textContent, buttons: document.querySelectorAll('button').length })`,
    );
    if (!result.heading?.includes("votre façon") || errors.length)
      throw new Error(JSON.stringify({ result, errors }));
    await window.webContents.executeJavaScript(
      `document.querySelector('.theme-toggle').click()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (
      (await window.webContents.executeJavaScript(
        `document.documentElement.dataset.theme`,
      )) !== "light"
    )
      throw new Error("Theme switch failed");
    await window.webContents.executeJavaScript(
      `(() => {document.querySelector('.theme-toggle').click(); const s=document.querySelector('.language-select'); const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;setter.call(s,'en');s.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (
      (await window.webContents.executeJavaScript(
        `document.documentElement.lang`,
      )) !== "en"
    )
      throw new Error("Language switch failed");
    if (
      !(await window.webContents.executeJavaScript(
        `document.querySelector('h1').textContent.includes('Your PDFs') && document.querySelector('.properties').textContent.includes('Properties')`,
      ))
    )
      throw new Error("English labels missing");
    await new Promise((resolve) => {
      window.webContents.once("did-finish-load", resolve);
      window.reload();
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    const persisted = await window.webContents.executeJavaScript(
      `({language:document.documentElement.lang,theme:document.documentElement.dataset.theme})`,
    );
    if (persisted.language !== "en" || persisted.theme !== "dark")
      throw new Error("Preferences did not persist");
    await window.webContents.executeJavaScript(
      `(() => {const s=document.querySelector('.language-select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'fr');s.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    await fs.mkdir(path.join(__dirname, "../tmp"), { recursive: true });
    await require("./interface-checks.cjs")(window);
    await fs.writeFile(
      path.join(__dirname, "../tmp/smoke.png"),
      (await window.webContents.capturePage()).toPNG(),
    );
    const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
    const fixture = await PDFDocument.create();
    const p = fixture.addPage([595, 842]);
    const font = await fixture.embedFont(StandardFonts.Helvetica);
    p.drawText("HayPDF - document de verification", {
      x: 45,
      y: 770,
      size: 22,
      font,
      color: rgb(0.25, 0.2, 0.35),
    });
    const bytes = Array.from(await fixture.save());
    await window.webContents.executeJavaScript(
      `(() => { const input = document.querySelector('input[accept="application/pdf"]'); const transfer = new DataTransfer(); transfer.items.add(new File([new Uint8Array(${JSON.stringify(bytes)})], 'verification.pdf', {type:'application/pdf'})); input.files = transfer.files; input.dispatchEvent(new Event('change', {bubbles:true})); })()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const loaded = await window.webContents.executeJavaScript(
      `({canvas: !!document.querySelector('.canvas-scroll canvas'), error: document.querySelector('.render-error')?.textContent})`,
    );
    if (!loaded.canvas || loaded.error || errors.length)
      throw new Error(JSON.stringify({ loaded, errors }));
    await require("./conversion-checks.cjs")(window, bytes);
    await require("./versions-checks.cjs")(window);
    await window.webContents.executeJavaScript(
      `[...document.querySelectorAll('.tools button')].find(b=>b.textContent==='Texte natif').click()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (
      !(await window.webContents.executeJavaScript(
        `!!document.querySelector('.native-block')`,
      ))
    )
      throw new Error("No native text detected");
    await window.webContents.executeJavaScript(
      `document.querySelector('.native-block').click()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    await window.webContents.executeJavaScript(
      `(()=>{const input=document.querySelector('.native-editor textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'HayPDF - document corrige');input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );
    if (
      (await window.webContents.executeJavaScript(
        `document.querySelectorAll('.properties textarea').length`,
      )) !== 1
    )
      throw new Error("Native editing must expose a single content field");
    await new Promise((resolve) => setTimeout(resolve, 100));
    await window.webContents.executeJavaScript(
      `document.querySelector('.native-editor .primary').click()`,
    );
    for (let i = 0; i < 100; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (
        await window.webContents.executeJavaScript(
          `!!document.querySelector('.notice')`,
        )
      )
        break;
    }
    const nativeNotice = await window.webContents.executeJavaScript(
      `document.querySelector('.notice')?.textContent`,
    );
    if (!nativeNotice?.includes("Remplacement effectué"))
      throw new Error(
        "Native replacement failed: " +
          nativeNotice +
          " " +
          JSON.stringify(errors),
      );
    await window.webContents.executeJavaScript(
      `document.querySelector('.ocr-button').click()`,
    );
    for (let i = 0; i < 600; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (
        await window.webContents.executeJavaScript(
          `!document.querySelector('.ocr-button').disabled`,
        )
      )
        break;
    }
    const recognized = await window.webContents.executeJavaScript(
      `({text:document.querySelector('.ocr-results textarea')?.value,notice:document.querySelector('.notice')?.textContent})`,
    );
    if (!recognized.text?.includes("HayPDF"))
      throw new Error("OCR failed: " + JSON.stringify({ recognized, errors }));
    await window.webContents.executeJavaScript(
      `(() => { [...document.querySelectorAll('.tools button')].find(b => b.textContent === 'Texte').click(); })()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    await window.webContents.executeJavaScript(
      `(() => { const page = document.querySelector('.canvas-scroll .pdf-page'); const rect = page.getBoundingClientRect(); page.dispatchEvent(new MouseEvent('click', {bubbles:true, clientX:rect.left+80, clientY:rect.top+140})); })()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (
      !(await window.webContents.executeJavaScript(
        `!!document.querySelector('.canvas-scroll .mark.text')`,
      ))
    )
      throw new Error("Ajout du texte impossible");
    async function press(keyCode, modifiers = []) {
      window.webContents.sendInputEvent({
        type: "keyDown",
        keyCode,
        modifiers,
      });
      window.webContents.sendInputEvent({ type: "keyUp", keyCode, modifiers });
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    await window.webContents.executeJavaScript(
      `document.activeElement?.blur()`,
    );
    const zoomBefore = await window.webContents.executeJavaScript(
      `document.querySelector('.viewbar').textContent`,
    );
    await press("0", ["control"]);
    if (
      !(await window.webContents.executeJavaScript(
        `document.querySelector('.viewbar').textContent.includes('100 %')`,
      ))
    )
      throw new Error("Ctrl+0 failed: " + zoomBefore);
    await press("=", ["control"]);
    if (
      !(await window.webContents.executeJavaScript(
        `document.querySelector('.viewbar').textContent.includes('110 %')`,
      ))
    )
      throw new Error("Ctrl+plus failed");
    await window.webContents.executeJavaScript(
      `document.querySelector('.canvas-scroll').dispatchEvent(new WheelEvent('wheel',{deltaY:100,ctrlKey:true,bubbles:true,cancelable:true}))`,
    );
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (
      !(await window.webContents.executeJavaScript(
        `document.querySelector('.viewbar').textContent.includes('100 %')`,
      ))
    )
      throw new Error("Ctrl+wheel failed");
    await press("z", ["control"]);
    if (
      await window.webContents.executeJavaScript(
        `!!document.querySelector('.canvas-scroll .mark.selected')`,
      )
    )
      throw new Error("Document undo failed");
    await press("z", ["control", "shift"]);
    if (
      !(await window.webContents.executeJavaScript(
        `!!document.querySelector('.canvas-scroll .mark.selected')`,
      ))
    )
      throw new Error("Document redo failed");
    await window.webContents.executeJavaScript(
      `document.querySelector('.properties textarea').focus()`,
    );
    await press("Delete");
    if (
      !(await window.webContents.executeJavaScript(
        `!!document.querySelector('.canvas-scroll .mark.selected')`,
      ))
    )
      throw new Error("Delete in input deleted document element");
    await window.webContents.executeJavaScript(
      `document.activeElement?.blur()`,
    );
    const left = await window.webContents.executeJavaScript(
      `parseFloat(document.querySelector('.canvas-scroll .mark.selected').style.left)`,
    );
    await press("Right", ["shift"]);
    const moved = await window.webContents.executeJavaScript(
      `parseFloat(document.querySelector('.canvas-scroll .mark.selected').style.left)`,
    );
    if (Math.abs(moved - left - 10) > 0.1)
      throw new Error("Arrow movement failed");
    await press("F1");
    if (
      !(await window.webContents.executeJavaScript(
        `!!document.querySelector('dialog[open]')`,
      ))
    )
      throw new Error("Shortcut help failed");
    await press("Escape");
    if (
      await window.webContents.executeJavaScript(
        `!!document.querySelector('dialog[open]')`,
      )
    )
      throw new Error("Closing shortcut help failed");
    await press("Delete");
    if (
      await window.webContents.executeJavaScript(
        `!!document.querySelector('.canvas-scroll .mark.selected')`,
      )
    )
      throw new Error("Delete selection failed");
    await fs.writeFile(
      path.join(__dirname, "../tmp/document.png"),
      (await window.webContents.capturePage()).toPNG(),
    );
    const fontkit = require("@pdf-lib/fontkit");
    const completeFont = new Uint8Array(
      await fs.readFile(
        path.join(__dirname, "../src/assets/fonts/NotoSerif-Regular.ttf"),
      ),
    );
    const subset = await PDFDocument.create();
    subset.registerFontkit(fontkit);
    const noto = await subset.embedFont(completeFont, { subset: true });
    subset.addPage([500, 300]).drawText("Malagasy | French | English", {
      x: 45,
      y: 220,
      font: noto,
      size: 14,
    });
    const subsetBytes = Array.from(await subset.save());
    async function waitFor(expression) {
      for (let i = 0; i < 100; i++) {
        if (await window.webContents.executeJavaScript(expression)) return;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error("Timed out: " + expression);
    }
    async function openSubset() {
      await window.webContents.executeJavaScript(
        `(()=>{const input=document.querySelector('input[accept="application/pdf"]');const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(${JSON.stringify(subsetBytes)})],'subset.pdf',{type:'application/pdf'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
      );
      await waitFor(
        `!document.querySelector('.workspace').inert && document.querySelector('.document-name').textContent.includes('subset.pdf')`,
      );
      await window.webContents.executeJavaScript(
        `[...document.querySelectorAll('header button')].find(button => button.textContent.trim() === 'Versions').click()`,
      );
      await waitFor(`!!document.querySelector('.versions-dialog[open]')`);
      if (
        (await window.webContents.executeJavaScript(
          `document.querySelectorAll('.version-entry').length`,
        )) !== 0
      )
        throw new Error("Opening another document must clear session versions");
      await window.webContents.executeJavaScript(
        `document.querySelector('.versions-dialog button[aria-label="Fermer"]').click()`,
      );
      await window.webContents.executeJavaScript(
        `[...document.querySelectorAll('.tools button')].find(b=>b.textContent==='Texte natif').click()`,
      );
      await waitFor(`!!document.querySelector('.native-block')`);
      await window.webContents.executeJavaScript(
        `document.querySelector('.native-block').click()`,
      );
      await waitFor(`!!document.querySelector('.native-editor textarea')`);
    }
    async function replaceSubset(value) {
      await window.webContents.executeJavaScript(
        `(()=>{const input=document.querySelector('.native-editor textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      await window.webContents.executeJavaScript(
        `document.querySelector('.native-editor .primary').click()`,
      );
      await waitFor(`!document.querySelector('.workspace').inert`);
    }
    await openSubset();
    await replaceSubset("Malagasy | French | Espagnol");
    if (
      !(await window.webContents.executeJavaScript(
        `document.querySelector('.notice')?.textContent.includes('Remplacement effectué')`,
      ))
    )
      throw new Error("Bundled Noto fallback failed");
    await openSubset();
    await replaceSubset("Malagasy | French | 🚀");
    if (
      !(await window.webContents.executeJavaScript(
        `document.querySelector('.operation-error-details pre')?.textContent.includes('U+1F680') && document.querySelector('.operation-error-details pre')?.textContent.includes('NotoSerif')`,
      ))
    )
      throw new Error("Full Unicode font error missing");
    await new Promise((resolve) => setTimeout(resolve, 250));
    await fs.writeFile(
      path.join(__dirname, "../tmp/font-error.png"),
      (await window.webContents.capturePage()).toPNG(),
    );
    await window.webContents.executeJavaScript(
      `(()=>{const input=document.querySelector('input[accept=".ttf,.otf"]');const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(${JSON.stringify(Array.from(completeFont))})],'NotoSerif-Regular.ttf'));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
    await waitFor(
      `document.querySelector('.notice')?.textContent.includes('Police chargée.') && !document.querySelector('.workspace').inert`,
    );
    await replaceSubset("Malagasy | French | Espagnol");
    if (
      !(await window.webContents.executeJavaScript(
        `document.querySelector('.notice')?.textContent.includes('Remplacement effectué')`,
      ))
    )
      throw new Error("Uploaded font replacement failed");
    const mupdf = await import("mupdf");
    const imagePixmap = new mupdf.Pixmap(
      mupdf.ColorSpace.DeviceRGB,
      [0, 0, 100, 50],
      false,
    );
    const imagePixels = imagePixmap.getPixels();
    for (let y = 0; y < 50; y++)
      for (let x = 0; x < 100; x++) {
        const offset = (y * 100 + x) * 3;
        imagePixels[offset] = x < 50 ? 255 : 0;
        imagePixels[offset + 1] = 0;
        imagePixels[offset + 2] = x >= 50 ? 255 : 0;
      }
    const pngBytes = Array.from(imagePixmap.asPNG());
    imagePixmap.destroy();
    await window.webContents.executeJavaScript(
      `(()=>{const input=document.querySelector('input[accept="image/png,image/jpeg"]');const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(${JSON.stringify(pngBytes)})],'image.png',{type:'image/png'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
    await waitFor(
      `document.querySelector('.notice')?.textContent.includes('Cliquez sur la page pour placer votre image') && !document.querySelector('.workspace').inert`,
    );
    const origin = await window.webContents.executeJavaScript(
      `(()=>{const rect=document.querySelector('.canvas-scroll .pdf-page').getBoundingClientRect();return {x:Math.round(rect.left+80),y:Math.round(rect.top+80)}})()`,
    );
    window.webContents.sendInputEvent({ type: "mouseMove", ...origin });
    window.webContents.sendInputEvent({
      type: "mouseDown",
      button: "left",
      clickCount: 1,
      ...origin,
    });
    window.webContents.sendInputEvent({
      type: "mouseUp",
      button: "left",
      clickCount: 1,
      ...origin,
    });
    await waitFor(
      `!!document.querySelector('.canvas-scroll .mark.image.selected')`,
    );
    if (
      await window.webContents.executeJavaScript(
        `!!document.querySelector('.notice')`,
      )
    )
      throw new Error("Placement information did not disappear");
    if (
      (await window.webContents.executeJavaScript(
        `document.querySelectorAll('.canvas-scroll .image-resize-handle').length`,
      )) !== 8
    )
      throw new Error("Missing resize handles");
    const imageSize = () =>
      window.webContents.executeJavaScript(
        `(()=>{const image=document.querySelector('.canvas-scroll .mark.image');return {width:parseFloat(image.style.width),height:parseFloat(image.style.height)}})()`,
      );
    const initialSize = await imageSize();
    const corner = await window.webContents.executeJavaScript(
      `(()=>{const rect=document.querySelector('.canvas-scroll .handle-se').getBoundingClientRect();return {x:Math.round(rect.left+rect.width/2),y:Math.round(rect.top+rect.height/2)}})()`,
    );
    window.webContents.sendInputEvent({ type: "mouseMove", ...corner });
    window.webContents.sendInputEvent({
      type: "mouseDown",
      button: "left",
      clickCount: 1,
      ...corner,
    });
    window.webContents.sendInputEvent({
      type: "mouseMove",
      button: "left",
      modifiers: ["leftButtonDown"],
      x: corner.x + 80,
      y: corner.y + 40,
    });
    window.webContents.sendInputEvent({
      type: "mouseUp",
      button: "left",
      clickCount: 1,
      x: corner.x + 80,
      y: corner.y + 40,
    });
    await new Promise((resolve) => setTimeout(resolve, 150));
    const resized = await imageSize();
    if (
      resized.width <= initialSize.width ||
      Math.abs(resized.width / resized.height - 2) > 0.01
    )
      throw new Error(
        "Aspect-ratio resizing failed: " +
          JSON.stringify({ initialSize, resized }),
      );
    await window.webContents.executeJavaScript(
      `document.activeElement?.blur()`,
    );
    await press("z", ["control"]);
    const undone = await imageSize();
    if (Math.abs(undone.width - initialSize.width) > 0.1)
      throw new Error("Image resize did not undo in one step");
    await press("y", ["control"]);
    const redone = await imageSize();
    if (Math.abs(redone.width - resized.width) > 0.1)
      throw new Error("Image resize redo failed");
    await window.webContents.executeJavaScript(
      `(()=>{const input=document.querySelector('.image-properties select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(input,'cover');input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (
      (await window.webContents.executeJavaScript(
        `(()=>{const frame=document.querySelector('.canvas-scroll .image-content').getBoundingClientRect(),image=document.querySelector('.canvas-scroll .image-content image').getBoundingClientRect();return document.querySelector('.image-properties select').value==='cover' && image.width>=frame.width-.1 && image.height>=frame.height-.1;})()`,
      )) !== true
    )
      throw new Error("Image fit control failed");
    const freeCorner = await window.webContents.executeJavaScript(
      `(()=>{const rect=document.querySelector('.canvas-scroll .handle-se').getBoundingClientRect();return {x:Math.round(rect.left+rect.width/2),y:Math.round(rect.top+rect.height/2)}})()`,
    );
    window.webContents.sendInputEvent({ type: "mouseMove", ...freeCorner });
    window.webContents.sendInputEvent({
      type: "mouseDown",
      button: "left",
      clickCount: 1,
      modifiers: ["shift"],
      ...freeCorner,
    });
    window.webContents.sendInputEvent({
      type: "mouseMove",
      button: "left",
      modifiers: ["leftButtonDown", "shift"],
      x: freeCorner.x,
      y: freeCorner.y + 30,
    });
    window.webContents.sendInputEvent({
      type: "mouseUp",
      button: "left",
      clickCount: 1,
      modifiers: ["shift"],
      x: freeCorner.x,
      y: freeCorner.y + 30,
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const freeSize = await imageSize();
    if (
      Math.abs(freeSize.height - resized.height - 30) > 0.1 ||
      Math.abs(freeSize.width - resized.width) > 0.1
    )
      throw new Error("Free image resize with Shift failed");
    await new Promise((resolve) => setTimeout(resolve, 150));
    await fs.writeFile(
      path.join(__dirname, "../tmp/image-edit.png"),
      (await window.webContents.capturePage()).toPNG(),
    );
    await window.webContents.executeJavaScript(
      `[...document.querySelectorAll('.image-properties button')].find(button=>button.textContent.includes('Rétablir le format')).click()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    const restored = await imageSize();
    if (
      Math.abs(restored.width / restored.height - 2) > 0.01 ||
      Math.abs(restored.width - freeSize.width) > 0.1
    )
      throw new Error("Restoring image aspect ratio failed");
    await window.webContents.executeJavaScript(
      `document.querySelector('.sidebar-tabs button').click()`,
    );
    for (const label of [
      "Insérer une page vierge",
      "En-tête et pied de page",
      "Filigrane",
      "Lien",
      "Préparer un formulaire",
      "Biffer un PDF",
    ]) {
      await window.webContents.executeJavaScript(`(() => {
        [...document.querySelectorAll('.edit-tools button')].find(b=>b.textContent===${JSON.stringify(label)}).click();
      })()`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (
        !(await window.webContents.executeJavaScript(
          `!!document.querySelector('.advanced-dialog[open]')`,
        ))
      )
        throw new Error("Advanced dialog failed: " + label);
      await window.webContents.executeJavaScript(`(() => {
        const dialog=document.querySelector('.advanced-dialog');
        const field=dialog.querySelector('input[type="text"],input[type="url"]');
        if(field){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(field,field.type==='url'?'https://example.com':'TEST');field.dispatchEvent(new Event('input',{bubbles:true}));}
      })()`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (label === "Biffer un PDF") {
        await fs.writeFile(
          path.join(__dirname, "../tmp/advanced-tools.png"),
          (await window.webContents.capturePage()).toPNG(),
        );
      }
      await window.webContents.executeJavaScript(
        `document.querySelector('.advanced-dialog form').requestSubmit()`,
      );
      for (let attempt = 0; attempt < 80; attempt++) {
        if (
          !(await window.webContents.executeJavaScript(
            `!!document.querySelector('.advanced-dialog')`,
          ))
        )
          break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (
        await window.webContents.executeJavaScript(
          `!!document.querySelector('.advanced-dialog')`,
        )
      )
        throw new Error(
          "Advanced operation failed: " +
            label +
            " " +
            (await window.webContents.executeJavaScript(
              `document.querySelector('.advanced-error')?.textContent`,
            )),
        );
      await window.webContents.executeJavaScript(
        `document.querySelector('button[title="Annuler"]').click()`,
      );
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    await require("./document-tools-checks.cjs")(window, pngBytes);
    await require("./workbench-checks.cjs")(window, pngBytes);
    await require("./native-images-checks.cjs")(window, pngBytes);
    await require("./shapes-checks.cjs")(window);
    await require("./tables-checks.cjs")(window);
    await require("./graphs-checks.cjs")(window);
    await require("./image-editing-checks.cjs")(window,pngBytes);
    await require("./image-detection-checks.cjs")(window, pngBytes);
    console.log("Electron smoke OK", result);
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
