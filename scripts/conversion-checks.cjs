const assert = require("node:assert/strict");
const { unzipSync, strFromU8 } = require("fflate");
const fs = require("node:fs/promises");
const path = require("node:path");

module.exports = async function checkConversions(window, originalBytes) {
  const js = (code) => window.webContents.executeJavaScript(code);
  const pause = () => new Promise((resolve) => setTimeout(resolve, 100));
  async function wait(expression) {
    for (let i = 0; i < 600; i++) {
      if (await js(expression)) return;
      await pause();
    }
    throw new Error(
      "Conversion timeout: " +
        expression +
        " " +
        (await js(`document.querySelector('.advanced-error')?.textContent`)),
    );
  }
  async function click(label, selector = "button") {
    await js(
      `(() => {const button=[...document.querySelectorAll(${JSON.stringify(selector)})].find(button=>button.textContent.trim()===${JSON.stringify(label)});if(!button)throw new Error('Missing conversion button');button.click();})()`,
    );
    await pause();
  }
  async function load(bytes, name) {
    await js(
      `(() => {const input=document.querySelector('input[accept="application/pdf"]');const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(${JSON.stringify(bytes)})],${JSON.stringify(name)},{type:'application/pdf'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
    await wait(
      `!document.querySelector('.workspace').inert && document.querySelector('.document-name').textContent.includes(${JSON.stringify(name)})`,
    );
  }
  await js(`(() => {
    window.__conversionOriginal={create:URL.createObjectURL,revoke:URL.revokeObjectURL,click:HTMLAnchorElement.prototype.click};
    window.__conversionExports=[];const blobs=new Map();
    URL.createObjectURL=blob=>{const url=window.__conversionOriginal.create(blob);blobs.set(url,blob);return url;};
    URL.revokeObjectURL=url=>{blobs.delete(url);window.__conversionOriginal.revoke(url);};
    HTMLAnchorElement.prototype.click=function(){const blob=blobs.get(this.href);if(blob){const file={name:this.download};window.__conversionExports.push(file);blob.arrayBuffer().then(buffer=>file.bytes=Array.from(new Uint8Array(buffer)));}};
  })()`);
  try {
    for (const format of ["docx", "xlsx", "pptx", "rtf"]) {
      await click("Tous les outils", ".sidebar-tabs button");
      await click("Exporter un PDF", ".tools-catalog button");
      await wait(`!!document.querySelector('.document-tool-dialog[open]')`);
      await js(
        `(() => {const select=document.querySelector('.document-tool-dialog select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,${JSON.stringify(format)});select.dispatchEvent(new Event('change',{bubbles:true}));})()`,
      );
      await pause();
      if (format === "docx") {
        assert.ok(
          await js(
            `document.querySelectorAll('.document-tool-dialog select').length === 2`,
          ),
        );
        await fs.writeFile(
          path.join(__dirname, "../tmp/conversion-word.png"),
          (await window.webContents.capturePage()).toPNG(),
        );
      }
      await js(
        `document.querySelector('.document-tool-dialog form').requestSubmit()`,
      );
      await wait(
        `!document.querySelector('.document-tool-dialog') && !!window.__conversionExports.at(-1)?.bytes`,
      );
      const file = await js(`window.__conversionExports.at(-1)`),
        bytes = new Uint8Array(file.bytes);
      assert.ok(file.name.endsWith("." + format));
      if (format === "rtf")
        assert.match(new TextDecoder().decode(bytes), /HayPDF/);
      else {
        const archive = unzipSync(bytes);
        if (format === "docx")
          assert.match(strFromU8(archive["word/document.xml"]), /HayPDF/);
        if (format === "xlsx") assert.ok(archive["xl/worksheets/sheet1.xml"]);
        if (format === "pptx") assert.ok(archive["ppt/slides/slide1.xml"]);
      }
    }
    const png = await js(
      `(() => {const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=300;const context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,1200,300);context.fillStyle='black';context.font='72px Arial';context.fillText('HayPDF scanned conversion',40,170);return canvas.toDataURL('image/png').split(',')[1];})()`,
    );
    const { PDFDocument } = require("pdf-lib");
    const scanned = await PDFDocument.create();
    const image = await scanned.embedPng(Buffer.from(png, "base64"));
    scanned
      .addPage([600, 150])
      .drawImage(image, { x: 0, y: 0, width: 600, height: 150 });
    await load(Array.from(await scanned.save()), "scanned-conversion.pdf");
    await click("Tous les outils", ".sidebar-tabs button");
    await click("Exporter un PDF", ".tools-catalog button");
    await wait(`!!document.querySelector('.document-tool-dialog[open]')`);
    await js(
      `(() => {const select=document.querySelector('.document-tool-dialog select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'docx');select.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
    await pause();
    await js(
      `(() => {const select=document.querySelectorAll('.document-tool-dialog select')[1];Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'eng');select.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
    await pause();
    await js(
      `document.querySelector('.document-tool-dialog form').requestSubmit()`,
    );
    await wait(
      `!document.querySelector('.document-tool-dialog') && window.__conversionExports.length === 5 && !!window.__conversionExports.at(-1)?.bytes`,
    );
    const recognized = await js(`window.__conversionExports.at(-1)`);
    const recognizedArchive = unzipSync(new Uint8Array(recognized.bytes));
    assert.match(
      strFromU8(recognizedArchive["word/document.xml"]),
      /HayPDF.*scanned.*conversion/i,
    );
    await load(originalBytes, "verification.pdf");
  } finally {
    await js(
      `(() => {URL.createObjectURL=window.__conversionOriginal.create;URL.revokeObjectURL=window.__conversionOriginal.revoke;HTMLAnchorElement.prototype.click=window.__conversionOriginal.click;delete window.__conversionOriginal;delete window.__conversionExports;})()`,
    );
  }
  await click("Pages", ".sidebar-tabs button");
  console.log("PDF conversion smoke OK");
};
