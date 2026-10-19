const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { PDFDocument, rgb } = require("pdf-lib");
module.exports = async function checkImageEditing(window, pngBytes) {
  const js = (code) => window.webContents.executeJavaScript(code),
    pause = () => new Promise((r) => setTimeout(r, 100));
  async function wait(expression) {
    for (let i = 0; i < 100; i++) {
      if (await js(expression)) return;
      await pause();
    }
    throw new Error(
      "Image editing timeout: " +
        expression +
        " " +
        (await js(`document.querySelector('main .table-error')?.textContent`)),
    );
  }
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([500, 500]),
    image = await pdf.embedPng(new Uint8Array(pngBytes));
  page.drawImage(image, { x: 50, y: 300, width: 100, height: 80 });
  page.drawRectangle({
    x: 230,
    y: 150,
    width: 180,
    height: 120,
    color: rgb(0.1, 0.5, 0.6),
  });
  page.drawText("Vector illustration", { x: 250, y: 200, size: 10 });
  page.drawText("Outside", { x: 20, y: 470, size: 10 });
  const bytes = Array.from(await pdf.save());
  await js(
    `(()=>{const input=document.querySelector('input[accept="application/pdf"]');const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(${JSON.stringify(bytes)})],'image-editing.pdf',{type:'application/pdf'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await wait(
    `document.querySelector('.document-name').textContent.includes('image-editing.pdf') && !!document.querySelector('.canvas-scroll .native-image-block')`,
  );
  await js(
    `document.querySelector('.canvas-scroll .native-image-block').click()`,
  );
  await pause();
  await js(
    `[...document.querySelectorAll('.properties button')].find(b=>b.textContent.trim()==='Rendre l’image modifiable').click()`,
  );
  await wait(
    `!!document.querySelector('.canvas-scroll .mark.image .image-svg image') && !!document.querySelector('.image-properties')`,
  );
  const before = await js(
    `(()=>{const r=document.querySelector('.canvas-scroll .mark.image').getBoundingClientRect();return {width:r.width,height:r.height};})()`,
  );
  await js(
    `document.querySelector('.image-properties button[title="Tourner à droite"]').click()`,
  );
  await pause();
  const rotated = await js(
    `(()=>{const r=document.querySelector('.canvas-scroll .mark.image').getBoundingClientRect();return {width:r.width,height:r.height};})()`,
  );
  assert.ok(
    Math.abs(before.width - rotated.height) < 0.1 &&
      Math.abs(before.height - rotated.width) < 0.1,
  );
  await js(
    `document.querySelector('.image-properties button[title="Miroir horizontal"]').click()`,
  );
  await pause();
  assert.equal(
    await js(
      `document.querySelector('.image-properties button[title="Miroir horizontal"]').getAttribute('aria-pressed')`,
    ),
    "true",
  );
  await js(
    `(()=>{const input=[...document.querySelectorAll('.image-properties label')].find(l=>l.textContent.includes('Opacité')).querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'50');input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
  );
  await wait(
    `document.querySelector('.canvas-scroll .image-svg image').getAttribute('opacity') === '0.5'`,
  );
  await js(
    `[...document.querySelectorAll('.image-properties button')].find(b=>b.textContent.trim()==='Remplacer l’image').click()`,
  );
  const oldHref = await js(
    `document.querySelector('.canvas-scroll .image-svg image').getAttribute('href')`,
  );
  await js(
    `(()=>{const input=document.querySelector('.image-replacement-input'),transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(${JSON.stringify(pngBytes)})],'replacement.png',{type:'image/png'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await wait(
    `document.querySelector('.canvas-scroll .image-svg image').getAttribute('href') !== ${JSON.stringify(oldHref)}`,
  );
  const replaced = await js(
    `document.querySelector('.canvas-scroll .image-svg image').getAttribute('href')`,
  );
  await fs.writeFile(
    path.join(__dirname, "../tmp/interface-image-editing.png"),
    (await window.webContents.capturePage()).toPNG(),
  );
  await js(`document.querySelector('button[title="Annuler"]').click()`);
  await wait(
    `document.querySelector('.canvas-scroll .image-svg image').getAttribute('href') === ${JSON.stringify(oldHref)}`,
  );
  await js(`document.querySelector('button[title="Rétablir"]').click()`);
  await wait(
    `document.querySelector('.canvas-scroll .image-svg image').getAttribute('href') === ${JSON.stringify(replaced)}`,
  );
  await js(
    `[...document.querySelectorAll('.properties button')].find(b=>b.textContent.trim()==='Modifier une illustration par zone').click()`,
  );
  await wait(`!!document.querySelector('.area-selection-layer')`);
  const b = await js(
    `(()=>{const r=document.querySelector('.area-selection-layer').getBoundingClientRect(),s=r.width/500;return {x:Math.round(r.left+225*s),y:Math.round(r.top+225*s),right:Math.round(r.left+415*s),bottom:Math.round(r.top+355*s)};})()`,
  );
  window.webContents.sendInputEvent({
    type: "mouseDown",
    x: b.x,
    y: b.y,
    button: "left",
    clickCount: 1,
  });
  await pause();
  window.webContents.sendInputEvent({
    type: "mouseMove",
    x: b.right,
    y: b.bottom,
  });
  await pause();
  window.webContents.sendInputEvent({
    type: "mouseUp",
    x: b.right,
    y: b.bottom,
    button: "left",
    clickCount: 1,
  });
  await wait(
    `!document.querySelector('.area-selection-layer') && !!document.querySelector('.image-properties') && document.querySelector('.canvas-scroll .image-svg image').getAttribute('href') !== ${JSON.stringify(replaced)}`,
  );
  await wait(
    `(()=>{const canvas=document.querySelector('.canvas-scroll canvas'),page=document.querySelector('.canvas-scroll .pdf-page'),scale=page.getBoundingClientRect().width/500,ratio=canvas.width/page.getBoundingClientRect().width,p=canvas.getContext('2d').getImageData(Math.round(60*scale*ratio),Math.round(130*scale*ratio),1,1).data;return p[0]>200&&p[1]<220&&p[2]<220;})()`,
  );
  await fs.writeFile(
    path.join(__dirname, "../tmp/interface-illustration-editing.png"),
    (await window.webContents.capturePage()).toPNG(),
  );
  await js(`document.querySelector('button[title="Annuler"]').click()`);
  await wait(
    `document.querySelector('.canvas-scroll .image-svg image').getAttribute('href') === ${JSON.stringify(replaced)}`,
  );
  console.log(
    "Image editing smoke OK (embedded image, rotation, flip, opacity, replacement, vector area, undo)",
  );
};
