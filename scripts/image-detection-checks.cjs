const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { PDFDocument, rgb, degrees } = require("pdf-lib");
module.exports = async function checkImageDetection(window, pngBytes) {
  const js = (code) => window.webContents.executeJavaScript(code),
    pause = () => new Promise((r) => setTimeout(r, 100));
  async function wait(expression) {
    for (let i = 0; i < 100; i++) {
      if (await js(expression)) return;
      await pause();
    }
    throw new Error("Detection timeout: " + expression);
  }
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([500, 500]),
    image = await pdf.embedPng(new Uint8Array(pngBytes));
  page.drawImage(image, {
    x: 100,
    y: 300,
    width: 60,
    height: 40,
    rotate: degrees(45),
  });
  page.drawRectangle({
    x: 220,
    y: 140,
    width: 220,
    height: 130,
    color: rgb(0.95, 0.96, 0.98),
  });
  page.drawRectangle({
    x: 240,
    y: 155,
    width: 95,
    height: 70,
    color: rgb(0.15, 0.55, 0.6),
  });
  page.drawCircle({ x: 380, y: 235, size: 20, color: rgb(1, 0.8, 0.3) });
  page.drawText("Vector illustration", { x: 250, y: 200, size: 10 });
  const bytes = Array.from(await pdf.save());
  await js(
    `(()=>{const input=document.querySelector('input[accept="application/pdf"]'),transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(${JSON.stringify(bytes)})],'detection.pdf',{type:'application/pdf'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await wait(
    `document.querySelector('.document-name').textContent.includes('detection.pdf') && document.querySelectorAll('.canvas-scroll .native-image-block').length===2`,
  );
  assert.ok(
    await js(
      `(()=>{const button=document.querySelector('.canvas-scroll .native-image-block[aria-label^="Image "]'),r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.left+1,r.top+1);return getComputedStyle(button).clipPath.startsWith('polygon') && !hit?.closest('.native-image-block');})()`,
    ),
    "The empty corner of a rotated image must not be selectable",
  );
  await js(
    `document.querySelector('.canvas-scroll .native-image-block[aria-label^="Illustration vectorielle"]').click()`,
  );
  await wait(
    `!![...document.querySelectorAll('.properties button')].find(b=>b.textContent.trim()==='Rendre la zone modifiable')`,
  );
  assert.ok(
    await js(
      `![...document.querySelectorAll('.properties button')].some(b=>b.textContent.trim()==='Supprimer l’image intégrée')`,
    ),
  );
  await pause();
  await fs.writeFile(
    path.join(__dirname, "../tmp/interface-image-detection.png"),
    (await window.webContents.capturePage()).toPNG(),
  );
  await js(
    `[...document.querySelectorAll('.properties button')].find(b=>b.textContent.trim()==='Rendre la zone modifiable').click()`,
  );
  await wait(
    `!!document.querySelector('.image-properties') && !!document.querySelector('.canvas-scroll .mark.image')`,
  );
  await js(`document.querySelector('button[title="Annuler"]').click()`);
  await wait(
    `!!document.querySelector('.canvas-scroll .native-image-block[aria-label^="Illustration vectorielle"]') && !document.querySelector('.canvas-scroll .mark.image')`,
  );
  console.log(
    "Image detection smoke OK (rotated footprint, vector area, conversion, undo)",
  );
};
