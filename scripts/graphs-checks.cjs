const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { PDFDocument, rgb } = require("pdf-lib");
module.exports = async function checkGraphs(window) {
  const js = (code) => window.webContents.executeJavaScript(code),
    pause = () => new Promise((r) => setTimeout(r, 100));
  async function wait(expression) {
    for (let i = 0; i < 100; i++) {
      if (await js(expression)) return;
      await pause();
    }
    throw new Error(
      "Graph timeout: " +
        expression +
        " " +
        (await js(
          `document.querySelector('.graph-editor-dialog .table-error')?.textContent`,
        )),
    );
  }
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([500, 500]);
  page.drawRectangle({
    x: 100,
    y: 200,
    width: 50,
    height: 100,
    color: rgb(0, 0.5, 0.6),
  });
  page.drawText("OLD_GRAPH", { x: 100, y: 310, size: 12 });
  page.drawText("Outside unchanged", { x: 20, y: 470, size: 12 });
  const bytes = Array.from(await pdf.save());
  await js(
    `(()=>{const input=document.querySelector('input[accept="application/pdf"]');const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(${JSON.stringify(bytes)})],'charts.pdf',{type:'application/pdf'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await wait(
    `document.querySelector('.document-name').textContent.includes('charts.pdf') && !document.querySelector('.graph-tool').disabled`,
  );
  async function open() {
    await js(`document.querySelector('.graph-tool').click()`);
    await wait(`!!document.querySelector('.area-selection-layer')`);
    const b = await js(
      `(()=>{const r=document.querySelector('.area-selection-layer').getBoundingClientRect(),s=r.width/500;return {x:Math.round(r.left+40*s),y:Math.round(r.top+80*s),right:Math.round(r.left+460*s),bottom:Math.round(r.top+380*s)};})()`,
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
    await wait(`!!document.querySelector('.graph-editor-dialog[open]')`);
  }
  await open();
  assert.ok(
    await js(
      `document.querySelector('.graph-source').textContent.includes('OLD_GRAPH')`,
    ),
  );
  for (let i = 0; i < 3; i++) {
    await js(
      `[...document.querySelectorAll('.graph-editor-dialog button')].find(b=>b.textContent.trim()==='Ajouter un élément').click()`,
    );
    await pause();
  }
  await js(
    `(()=>{const set=(el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));};set(document.querySelector('.graph-settings input'),'Completion');document.querySelectorAll('.graph-item').forEach((item,i)=>{set(item.querySelector('input'),['Jan','Feb','Mar'][i]);set(item.querySelector('input[type="number"]'),[42,58,66][i]);});})()`,
  );
  await pause();
  for (const type of ["bars", "pie", "process"]) {
    await js(
      `(()=>{const select=document.querySelector('.graph-settings select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,${JSON.stringify(type)});select.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
    await pause();
    await wait(
      `!!document.querySelector('.graph-preview path') && (${type === "pie" ? "document.querySelector('.graph-preview').textContent.includes('%')" : type === "bars" ? "document.querySelector('.graph-preview').textContent.includes('42')" : "!document.querySelector('.graph-preview').textContent.includes('42') && !document.querySelector('.graph-preview').textContent.includes('%')"})`,
    );
    assert.ok(
      await js(
        `document.querySelector('.graph-preview').textContent.includes('Completion')`,
      ),
    );
    await fs.writeFile(
      path.join(__dirname, `../tmp/interface-graph-${type}.png`),
      (await window.webContents.capturePage()).toPNG(),
    );
  }
  await js(
    `[...document.querySelectorAll('.graph-editor-dialog button')].find(b=>b.textContent.trim()==='Appliquer le graphique').click()`,
  );
  await wait(
    `!document.querySelector('.graph-editor-dialog') && !document.querySelector('.graph-tool').disabled`,
  );
  await open();
  assert.ok(
    await js(
      `document.querySelector('.graph-source').textContent.includes('Completion') && !document.querySelector('.graph-source').textContent.includes('OLD_GRAPH')`,
    ),
  );
  await js(`document.querySelector('.graph-editor-dialog').close()`);
  await pause();
  await js(`document.querySelector('button[title="Annuler"]').click()`);
  await pause();
  await open();
  assert.ok(
    await js(
      `document.querySelector('.graph-source').textContent.includes('OLD_GRAPH')`,
    ),
  );
  await js(`document.querySelector('.graph-editor-dialog').close()`);
  await pause();
  console.log("Graphs smoke OK (area, data entry, all previews, apply, undo)");
};
