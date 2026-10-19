const assert = require("node:assert/strict");
const { PDFDocument } = require("pdf-lib");

module.exports = async function checkNativeImages(window, pngBytes) {
  const js = (code) => window.webContents.executeJavaScript(code);
  async function wait(expression) {
    for (let i = 0; i < 100; i++) {
      if (await js(expression)) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Native images timeout: " + expression);
  }
  async function click(label) {
    await js(
      `(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)}); if (!b || b.disabled) throw new Error('Missing image action'); b.click(); })()`,
    );
  }
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(new Uint8Array(pngBytes));
  pdf
    .addPage([400, 500])
    .drawImage(image, { x: 50, y: 100, width: 100, height: 80 });
  pdf.getPage(0).drawText("Editable native text", { x: 55, y: 130, size: 10 });
  const bytes = Array.from(await pdf.save());
  await js(
    `(() => { const input = document.querySelector('input[accept="application/pdf"]'); const transfer = new DataTransfer(); transfer.items.add(new File([new Uint8Array(${JSON.stringify(bytes)})], 'native-images.pdf', {type:'application/pdf'})); input.files = transfer.files; input.dispatchEvent(new Event('change', {bubbles:true})); })()`,
  );
  await wait(
    `document.body.textContent.includes('native-images.pdf') && !document.querySelector('header button[disabled]')`,
  );
  await js(
    `([...document.querySelectorAll('.tools button')].find(b=>b.textContent.trim()==='Sélection')).click()`,
  );
  await wait(
    `!!document.querySelector('.canvas-scroll .native-block:not(.native-image-block)')`,
  );
  await js(
    `document.querySelector('.canvas-scroll .native-block:not(.native-image-block)').click()`,
  );
  await wait(
    `!!document.querySelector('.properties textarea') && document.querySelector('.properties textarea').value.includes('Editable native text')`,
  );
  await js(
    `document.querySelector('.canvas-scroll .native-image-block').click()`,
  );
  await wait(
    `!![...document.querySelectorAll('.properties button')].find(b=>b.textContent.trim()==='Supprimer l’image intégrée')`,
  );
  assert.equal(
    await js(`document.querySelectorAll('.properties textarea').length`),
    0,
    "Image selection must clear text options",
  );
  await js(
    `document.querySelector('.canvas-scroll .pdf-page').dispatchEvent(new MouseEvent('click',{bubbles:true}))`,
  );
  await wait(
    `!document.querySelector('.native-image-block.selected') && !document.querySelector('.properties textarea')`,
  );
  // Detection may already be enabled from a previous document.
  if (
    !(await js(
      `!![...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Images intégrées au PDF' && b.getAttribute('aria-expanded') === 'true')`,
    ))
  )
    await click("Images intégrées au PDF");
  await wait(`document.querySelectorAll('.native-image-block').length === 1`);
  await js(`document.querySelector('.native-image-block').click()`);
  await wait(`!!document.querySelector('.native-image-block.selected')`);
  await click("Supprimer l’image intégrée");
  await wait(
    `document.body.textContent.includes('Aucune image intégrée détectée sur cette page.')`,
  );
  assert.equal(
    await js(`document.querySelectorAll('.native-image-block').length`),
    0,
  );
  await js(`document.querySelector('button[title="Annuler"]').click()`);
  await wait(`document.querySelectorAll('.native-image-block').length === 1`);
  await js(`document.querySelector('button[title="Rétablir"]').click()`);
  await wait(
    `document.body.textContent.includes('Aucune image intégrée détectée sur cette page.')`,
  );
  console.log("Native images smoke OK (selection, deletion, undo, redo)");
};
