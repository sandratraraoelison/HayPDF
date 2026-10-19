const assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs/promises"),
  { PDFDocument, PDFName, PDFDict } = require("pdf-lib");
module.exports = async function workbenchChecks(window, pngBytes) {
  const js = (script) => window.webContents.executeJavaScript(script),
    pause = () => new Promise((resolve) => setTimeout(resolve, 80));
  async function wait(expression) {
    for (let i = 0; i < 150; i++) {
      if (await js(expression)) return;
      await pause();
    }
    throw new Error(
      "Workbench timeout " +
        expression +
        " " +
        (await js(
          `document.querySelector('.workbench-dialog .advanced-error')?.textContent`,
        )),
    );
  }
  async function click(label, selector = ".workbench-dialog button") {
    await js(
      `(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.textContent.trim()===${JSON.stringify(label)});if(!el)throw new Error('Missing '+${JSON.stringify(label)});el.click();})()`,
    );
    await pause();
  }
  async function value(selector, value) {
    await js(
      `(()=>{const el=document.querySelector(${JSON.stringify(selector)});const p=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event(el instanceof HTMLSelectElement?'change':'input',{bubbles:true}));})()`,
    );
    await pause();
  }
  async function inject(selector, files) {
    await js(
      `(()=>{const input=document.querySelector(${JSON.stringify(selector)}),dt=new DataTransfer();for(const file of ${JSON.stringify(files)})dt.items.add(new File([new Uint8Array(file.bytes)],file.name,{type:file.type}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
    await pause();
  }
  async function ready() {
    await wait(`!document.querySelector('.workspace').inert`);
  }
  async function open(label) {
    await click("Tous les outils", ".sidebar-tabs button");
    await click(label, ".tools-catalog button");
    await wait(`!!document.querySelector('.workbench-dialog[open]')`);
    await ready();
  }
  async function close() {
    await ready();
    await click("Fermer");
    await wait(`!document.querySelector('.workbench-dialog')`);
  }
  async function lastFile() {
    await wait(`!!window.__toolExports.at(-1)?.bytes`);
    return js(`window.__toolExports.at(-1)`);
  }
  const fixture = await PDFDocument.create();
  fixture
    .addPage([400, 500])
    .drawText("Review document", { x: 30, y: 400, size: 20 });
  const fixtureBytes = Array.from(await fixture.save());
  await inject('input[accept="application/pdf"]', [
    { name: "workbench.pdf", type: "application/pdf", bytes: fixtureBytes },
  ]);
  await wait(
    `document.querySelector('.document-name').textContent.includes('workbench.pdf')`,
  );

  await open("Ajouter des commentaires");
  await value(".review-panel input:not([type])", "Alice");
  await value(".review-panel textarea", "First review note");
  await click("Ajouter le commentaire");
  await wait(
    `document.querySelector('.review-list')?.textContent.includes('First review note')`,
  );
  await ready();
  await click("Répondre");
  await value(".review-panel textarea", "Reply from reviewer");
  await click("Ajouter le commentaire");
  await wait(`document.querySelectorAll('.review-list>li').length===2`);
  await ready();
  await click("Exporter les retours JSON");
  let file = await lastFile();
  assert.equal(
    JSON.parse(new TextDecoder().decode(new Uint8Array(file.bytes))).comments
      .length,
    2,
  );
  await close();
  await open("Mesurer des objets");
  await wait(`!!document.querySelector('.measurement-preview canvas')?.width`);
  await js(
    `(()=>{const page=document.querySelector('.measurement-preview .pdf-page'),rect=page.getBoundingClientRect();for(const x of [30,80])page.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:rect.left+x,clientY:rect.top+40}));})()`,
  );
  await pause();
  // React commits each click separately, as with actual pointer events.
  await js(
    `(()=>{const page=document.querySelector('.measurement-preview .pdf-page'),rect=page.getBoundingClientRect();page.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:rect.left+130,clientY:rect.top+40}));})()`,
  );
  await pause();
  assert.notEqual(
    await js(
      `document.querySelector('.measurement-result').textContent.trim()`,
    ),
    "— mm",
  );
  await click("Inscrire la mesure dans le PDF");
  await ready();
  await close();
  await open("Tampons personnalisés");
  await value(".workbench-dialog input:not([type])", "APPROVED {page}");
  await click("Ajouter le tampon");
  await ready();
  await close();

  await open("Comparer des fichiers");
  await inject('.workbench-dialog input[type="file"]', [
    { name: "original.pdf", type: "application/pdf", bytes: fixtureBytes },
  ]);
  await click("Comparer");
  await wait(`document.querySelectorAll('.comparison-images img').length===3`);
  await ready();
  await fs.writeFile(
    path.join(__dirname, "../tmp/comparison.png"),
    (await window.webContents.capturePage()).toPNG(),
  );
  await close();
  await open("Contenu multimédia");
  await inject('.workbench-dialog input[type="file"]', [
    { name: "preview.png", type: "image/png", bytes: pngBytes },
  ]);
  await wait(
    `document.querySelector('.review-list')?.textContent.includes('preview.png')`,
  );
  await ready();
  await click("Extraire");
  assert.equal((await lastFile()).bytes.length, pngBytes.length);
  await close();
  await open("Prépresse");
  await click("Appliquer les boîtes de coupe et fond perdu");
  await ready();
  await click("Exporter le rapport d’inspection");
  file = await lastFile();
  assert.ok(
    JSON.parse(new TextDecoder().decode(new Uint8Array(file.bytes))).pages[0]
      .trim[0] > 0,
  );
  await close();
  await open("Préparer l’accessibilité");
  await value(".workbench-dialog input:not([type])", "Accessible review");
  await click("Appliquer les métadonnées et descriptions");
  await ready();
  await click("Exporter une transcription HTML accessible");
  file = await lastFile();
  assert.match(new TextDecoder().decode(new Uint8Array(file.bytes)), /<main>/);
  await close();
  await open("JavaScript du document");
  await value(".code-editor", "this.getField('total');");
  await click("Intégrer le script");
  await ready();
  await click("Exporter le PDF");
  file = await lastFile();
  let pdf = await PDFDocument.load(new Uint8Array(file.bytes));
  assert.ok(
    pdf.catalog
      .lookup(PDFName.of("Names"), PDFDict)
      .get(PDFName.of("JavaScript")),
  );
  await close();
  await open("Normes PDF");
  await click("Exporter la copie d’archivage PDF/A-2b");
  await ready();
  file = await lastFile();
  pdf = await PDFDocument.load(new Uint8Array(file.bytes));
  assert.ok(pdf.catalog.get(PDFName.of("OutputIntents")));
  await close();

  await open("Actions guidées et outils personnalisés");
  await value(".workbench-dialog input:not([type])", "Compress locally");
  await click("Enregistrer l’outil");
  await ready();
  await close();
  await open("Actions guidées et outils personnalisés");
  assert.ok(
    await js(
      `document.querySelector('.workbench-dialog').textContent.includes('Compress locally')`,
    ),
  );
  await click("Exécuter les actions");
  await ready();
  await close();
  await js(
    `new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase('haypdf-search');request.onsuccess=resolve;request.onerror=reject;})`,
  );
  await open("Index de recherche");
  await inject('.workbench-dialog input[type="file"]', [
    { name: "searchable.pdf", type: "application/pdf", bytes: fixtureBytes },
  ]);
  await ready();
  await value('.workbench-dialog input[type="search"]', "Review");
  await wait(
    `document.querySelector('.review-list')?.textContent.includes('searchable.pdf')`,
  );
  await close();
  await open("Index de recherche");
  assert.ok(
    await js(
      `document.querySelector('.workbench-dialog').textContent.includes('searchable.pdf')`,
    ),
  );
  await close();
  const { accessiblePdf } = require("../electron/accessiblePdf.cjs");
  const accessible = await accessiblePdf(
    '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Accessible</title></head><body><h1>Title</h1><p>Paragraph</p></body></html>',
  );
  const tagged = await PDFDocument.load(accessible);
  assert.ok(tagged.catalog.get(PDFName.of("StructTreeRoot")));
  console.log("Workbench smoke OK");
};
