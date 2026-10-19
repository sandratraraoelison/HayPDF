const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { PDFDocument } = require("pdf-lib");

module.exports = async function checkDocumentTools(window, pngBytes) {
  const js = (script) => window.webContents.executeJavaScript(script);
  const pause = () => new Promise((resolve) => setTimeout(resolve, 80));
  async function wait(expression) {
    for (let i = 0; i < 100; i++) {
      if (await js(expression)) return;
      await pause();
    }
    throw new Error(
      "UI timeout: " +
        expression +
        " " +
        (await js(
          `document.querySelector('dialog .advanced-error')?.textContent`,
        )),
    );
  }
  async function click(label, selector = "button") {
    await js(
      `(()=>{const button=[...document.querySelectorAll(${JSON.stringify(selector)})].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!button)throw new Error('Missing button '+${JSON.stringify(label)});button.click();})()`,
    );
    await pause();
  }
  async function value(selector, value) {
    await js(
      `(()=>{const el=document.querySelector(${JSON.stringify(selector)});const prototype=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event(el instanceof HTMLSelectElement?'change':'input',{bubbles:true}));})()`,
    );
    await pause();
  }
  async function open(label) {
    await click("Tous les outils", ".sidebar-tabs button");
    await click(label, ".tools-catalog button");
    await wait(`!!document.querySelector('.document-tool-dialog[open]')`);
  }
  async function submit() {
    await js(`document.querySelector('dialog form').requestSubmit()`);
    await wait(`!document.querySelector('dialog[open]')`);
  }
  async function inject(selector, files) {
    await js(
      `(()=>{const input=document.querySelector(${JSON.stringify(selector)});const transfer=new DataTransfer();for(const file of ${JSON.stringify(files)})transfer.items.add(new File([new Uint8Array(file.bytes)],file.name,{type:file.type}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
    await pause();
  }
  await js(`(()=>{
    window.__toolExports=[];const blobs=new Map();const create=URL.createObjectURL.bind(URL);const revoke=URL.revokeObjectURL.bind(URL);
    URL.createObjectURL=blob=>{const url=create(blob);blobs.set(url,blob);return url;};
    URL.revokeObjectURL=url=>{blobs.delete(url);revoke(url);};
    HTMLAnchorElement.prototype.click=function(){const blob=blobs.get(this.href);if(blob){const file={name:this.download};window.__toolExports.push(file);blob.arrayBuffer().then(buffer=>file.bytes=Array.from(new Uint8Array(buffer)));}};
  })()`);
  async function lastExport() {
    await wait(`!!window.__toolExports.at(-1)?.bytes`);
    return js(`window.__toolExports.at(-1)`);
  }

  await open("Créer un PDF");
  await submit();
  await wait(
    `document.querySelector('.document-name').textContent.includes('document.pdf')`,
  );
  await open("Créer un PDF");
  await value(".document-tool-dialog select", "images");
  await inject('.document-tool-dialog input[type="file"]', [
    { name: "one.png", type: "image/png", bytes: pngBytes },
    { name: "two.png", type: "image/png", bytes: pngBytes },
  ]);
  await click("↓", ".image-file-order button");
  assert.ok(
    await js(
      `document.querySelector('.image-file-order li').textContent.includes('two.png')`,
    ),
  );
  await submit();
  await click("Pages", ".sidebar-tabs button");
  await wait(`document.querySelectorAll('.thumbnail').length===2`);
  await click("Tous les outils", ".sidebar-tabs button");
  await click("Dupliquer la page", ".tools-catalog button");
  await click("Pages", ".sidebar-tabs button");
  await wait(`document.querySelectorAll('.thumbnail').length===3`);
  await js(`document.querySelectorAll('.thumbnail')[2].click()`);
  await pause();
  await js(`document.querySelector('button[title="Annuler"]').click()`);
  await wait(`document.querySelectorAll('.thumbnail').length===2`);
  assert.ok(await js(`document.querySelectorAll('.thumbnail')[1].classList.contains('current')`));
  await js(`document.querySelector('button[title="Page précédente"]').click()`);
  await pause();
  assert.ok(await js(`document.querySelectorAll('.thumbnail')[0].classList.contains('current')`), "Previous page must use the visible index after undo removes the last page");

  await open("Exporter un PDF");
  await value(".document-tool-dialog select", "pdf");
  await value('.document-tool-dialog input[placeholder="1-3,5"]', "2");
  await submit();
  let pdfExport = await lastExport();
  assert.equal(
    (await PDFDocument.load(new Uint8Array(pdfExport.bytes))).getPageCount(),
    1,
  );
  await open("Exporter un PDF");
  await submit();
  let file = await lastExport();
  assert.match(file.name, /-png.zip$/);
  const { unzipSync } = await import("fflate");
  assert.equal(Object.keys(unzipSync(new Uint8Array(file.bytes))).length, 2);
  await open("Exporter un PDF");
  await value(".document-tool-dialog select", "jpeg");
  await value('.document-tool-dialog input[placeholder="1-3,5"]', "1");
  await submit();
  file = await lastExport();
  assert.match(file.name, /\.jpg$/);
  assert.equal(file.bytes[0], 255);
  await open("Exporter un PDF");
  await value(".document-tool-dialog select", "text");
  await submit();
  assert.match((await lastExport()).name, /\.txt$/);
  await open("Diviser un PDF");
  await value('.document-tool-dialog input[placeholder="1-3;4-6"]', "1;2");
  await submit();
  file = await lastExport();
  const parts = unzipSync(new Uint8Array(file.bytes));
  assert.equal(Object.keys(parts).length, 2);
  assert.equal(
    (await PDFDocument.load(Object.values(parts)[0])).getPageCount(),
    1,
  );
  await open("Compresser un PDF");
  await submit();
  assert.match((await lastExport()).name, /-compressed.pdf$/);
  await open("Protéger un PDF");
  await value('.document-tool-dialog input[type="password"]', "test-password");
  await value(
    ".document-tool-dialog label:nth-of-type(2) input",
    "test-password",
  );
  await submit();
  const protectedFile = await lastExport();
  const mupdf = await import("mupdf");
  const encrypted = mupdf.Document.openDocument(
    new Uint8Array(protectedFile.bytes),
    "application/pdf",
  );
  try {
    assert.ok(encrypted.needsPassword());
    assert.ok(encrypted.authenticatePassword("test-password"));
  } finally {
    encrypted.destroy();
  }
  await inject('input[accept="application/pdf"]', [
    {
      name: "protected.pdf",
      type: "application/pdf",
      bytes: protectedFile.bytes,
    },
  ]);
  await wait(`!!document.querySelector('#unlock-title')`);
  await value('dialog input[type="password"]', "wrong");
  await js(`document.querySelector('dialog form').requestSubmit()`);
  await wait(
    `document.querySelector('dialog .advanced-error')?.textContent.includes('incorrect')`,
  );
  await value('dialog input[type="password"]', "test-password");
  await submit();
  await wait(
    `document.querySelector('.document-name').textContent.includes('protected.pdf')`,
  );

  const form = await PDFDocument.create(),
    page = form.addPage([595, 842]);
  const fields = form.getForm();
  const name = fields.createTextField("Full name");
  name.setText("Before");
  name.addToPage(page, { x: 40, y: 700, width: 220, height: 30 });
  const checkbox = fields.createCheckBox("Accept");
  checkbox.addToPage(page, { x: 40, y: 650, width: 20, height: 20 });
  const dropdown = fields.createDropdown("Choice");
  dropdown.addOptions(["Alpha", "Beta"]);
  dropdown.select("Alpha");
  dropdown.addToPage(page, { x: 40, y: 600, width: 220, height: 30 });
  await inject('input[accept="application/pdf"]', [
    {
      name: "form.pdf",
      type: "application/pdf",
      bytes: Array.from(await form.save()),
    },
  ]);
  await wait(
    `document.querySelector('.document-name').textContent.includes('form.pdf')`,
  );
  await open("Remplir un formulaire");
  await value(".form-field-inputs input:not([type])", "After");
  await js(
    `document.querySelector('.form-field-inputs input[type="checkbox"]').click()`,
  );
  await value(".form-field-inputs select", "Beta");
  await submit();
  await open("Remplir un formulaire");
  assert.equal(
    await js(
      `document.querySelector('.form-field-inputs input:not([type])').value`,
    ),
    "After",
  );
  assert.equal(
    await js(
      `document.querySelector('.form-field-inputs input[type="checkbox"]').checked`,
    ),
    true,
  );
  await value(".document-tool-dialog fieldset > label select", "json");
  await submit();
  file = await lastExport();
  assert.deepEqual(
    JSON.parse(new TextDecoder().decode(new Uint8Array(file.bytes))),
    { "Full name": "After", Accept: true, Choice: "Beta" },
  );
  await open("Remplir un formulaire");
  await value(".document-tool-dialog fieldset > label select", "flatten");
  await submit();
  file = await lastExport();
  assert.equal(
    (await PDFDocument.load(new Uint8Array(file.bytes))).getForm().getFields()
      .length,
    0,
  );

  await click("Tous les outils", ".sidebar-tabs button");
  await fs.writeFile(
    path.join(__dirname, "../tmp/free-tools.png"),
    (await window.webContents.capturePage()).toPNG(),
  );
  console.log("Document tools smoke OK");
};
