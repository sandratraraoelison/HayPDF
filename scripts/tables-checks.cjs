const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { PDFDocument } = require("pdf-lib");
module.exports = async function checkTables(window) {
  const js = (code) => window.webContents.executeJavaScript(code);
  const pause = () => new Promise((resolve) => setTimeout(resolve, 100));
  async function wait(expression) {
    for (let i = 0; i < 100; i++) {
      if (await js(expression)) return;
      await pause();
    }
    throw new Error(
      "Table timeout: " +
        expression +
        " " +
        (await js(`document.querySelector('.table-error')?.textContent`)),
    );
  }
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([400, 400]);
  for (let c = 0; c <= 3; c++)
    page.drawLine({
      start: { x: 40 + c * 100, y: 120 },
      end: { x: 40 + c * 100, y: 280 },
      thickness: 1,
    });
  for (let r = 0; r <= 4; r++)
    page.drawLine({
      start: { x: 40, y: 120 + r * 40 },
      end: { x: 340, y: 120 + r * 40 },
      thickness: 1,
    });
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 3; c++)
      page.drawText(r === 2 && c === 0 ? "REMOVE_ME" : `R${r}C${c}`, {
        x: 45 + c * 100,
        y: 255 - r * 40,
        size: 10,
      });
  const bytes = Array.from(await pdf.save());
  await js(
    `(()=>{const input=document.querySelector('input[accept="application/pdf"]');const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(${JSON.stringify(bytes)})],'table.pdf',{type:'application/pdf'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await wait(
    `document.querySelector('.document-name').textContent.includes('table.pdf') && !document.querySelector('.table-tool').disabled`,
  );
  async function open() {
    await js(`document.querySelector('.table-tool').click()`);
    await wait(`!!document.querySelector('.area-selection-layer')`);
    const r = await js(
      `(()=>{const p=document.querySelector('.area-selection-layer'),r=p.getBoundingClientRect(),s=r.width/400;return {x:Math.round(r.left+37*s),y:Math.round(r.top+117*s),right:Math.round(r.left+399*s),bottom:Math.round(r.top+360*s)};})()`,
    );
    window.webContents.sendInputEvent({
      type: "mouseDown",
      x: r.x,
      y: r.y,
      button: "left",
      clickCount: 1,
    });
    await pause();
    window.webContents.sendInputEvent({
      type: "mouseMove",
      x: r.right,
      y: r.bottom,
    });
    await pause();
    window.webContents.sendInputEvent({
      type: "mouseUp",
      x: r.right,
      y: r.bottom,
      button: "left",
      clickCount: 1,
    });
    await wait(`!!document.querySelector('.table-editor-dialog[open]')`);
  }
  await open();
  assert.equal(
    await js(
      `document.querySelectorAll('.table-editor-dialog tbody tr').length`,
    ),
    4,
  );
  assert.equal(
    await js(
      `document.querySelectorAll('.table-editor-dialog tbody tr')[2].querySelector('textarea').value`,
    ),
    "REMOVE_ME",
  );
  await js(
    `document.querySelectorAll('.table-editor-dialog tbody tr')[2].querySelector('button[title="Supprimer la ligne"]').click()`,
  );
  await pause();
  await js(
    `[...document.querySelectorAll('.table-editor-dialog button')].find(b=>b.textContent.trim()==='Ajouter une ligne').click()`,
  );
  await pause();
  await js(
    `(()=>{const input=document.querySelectorAll('.table-editor-dialog tbody tr')[3].querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'NEW_ROW');input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
  );
  await pause();
  await js(
    `[...document.querySelectorAll('.table-editor-dialog button')].find(b=>b.textContent.trim()==='Ajouter une colonne').click()`,
  );
  await pause();
  await js(
    `(()=>{const input=document.querySelectorAll('.table-editor-dialog tbody tr')[1].querySelectorAll('textarea')[1];Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'Adding a column automatically adjusts the table dimensions');input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
  );
  await pause();
  await fs.writeFile(
    path.join(__dirname, "../tmp/interface-table-editor.png"),
    (await window.webContents.capturePage()).toPNG(),
  );
  await js(
    `[...document.querySelectorAll('.table-editor-dialog button')].find(b=>b.textContent.trim()==='Appliquer le tableau').click()`,
  );
  await wait(
    `!document.querySelector('.table-editor-dialog') && !document.querySelector('.table-tool').disabled`,
  );
  await open();
  assert.ok(
    await js(
      `[...document.querySelectorAll('.table-editor-dialog textarea')].some(e=>e.value==='NEW_ROW')`,
    ),
  );
  assert.ok(
    await js(
      `[...document.querySelectorAll('.table-editor-dialog textarea')].every(e=>!e.value.includes('REMOVE_ME'))`,
    ),
  );
  assert.equal(
    await js(
      `document.querySelectorAll('.table-editor-dialog tbody tr')[0].querySelectorAll('textarea').length`,
    ),
    4,
  );
  assert.ok(
    await js(
      `[...document.querySelectorAll('.table-editor-dialog textarea')].some(e=>e.value.replace(/\\s/g,'')==='Addingacolumnautomaticallyadjuststhetabledimensions')`,
    ),
  );
  await js(`document.querySelector('.table-editor-dialog').close()`);
  await pause();
  await js(`document.querySelector('button[title="Annuler"]').click()`);
  await pause();
  await open();
  assert.ok(
    await js(
      `[...document.querySelectorAll('.table-editor-dialog textarea')].some(e=>e.value==='REMOVE_ME')`,
    ),
  );
  for (let i = 0; i < 20; i++) {
    await js(
      `[...document.querySelectorAll('.table-editor-dialog button')].find(b=>b.textContent.trim()==='Ajouter une ligne').click()`,
    );
    await pause();
  }
  await js(
    `[...document.querySelectorAll('.table-editor-dialog button')].find(b=>b.textContent.trim()==='Appliquer le tableau').click()`,
  );
  await wait(
    `!document.querySelector('.table-editor-dialog') && document.querySelectorAll('.thumbnail').length > 1 && !document.querySelector('.table-tool').disabled`,
  );
  await new Promise((resolve) => setTimeout(resolve, 500));
  await fs.writeFile(
    path.join(__dirname, "../tmp/interface-table-pagination.png"),
    (await window.webContents.capturePage()).toPNG(),
  );
  await js(`document.querySelector('button[title="Annuler"]').click()`);
  await wait(`document.querySelectorAll('.thumbnail').length === 1`);

  await pause();
  console.log(
    "Tables smoke OK (column widths, word wrapping, row pagination, apply, reopen, undo)",
  );
};
