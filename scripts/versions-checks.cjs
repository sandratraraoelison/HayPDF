const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

module.exports = async function checkVersions(window) {
  const js = (code) => window.webContents.executeJavaScript(code);
  const pause = () => new Promise((resolve) => setTimeout(resolve, 100));
  async function wait(expression) {
    for (let i = 0; i < 100; i++) {
      if (await js(expression)) return;
      await pause();
    }
    throw new Error("Versions timeout: " + expression);
  }
  async function click(label, selector = "button") {
    await js(
      `(() => {const button=[...document.querySelectorAll(${JSON.stringify(selector)})].find(button => button.textContent.trim() === ${JSON.stringify(label)});if (!button) throw new Error('Missing version action');button.click();})()`,
    );
    await pause();
  }
  async function capture(name) {
    await js(
      `(() => {const input=document.querySelector('#version-name');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(name)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );
    await pause();
    await click("Garder cette étape");
  }
  await click("Versions", "header button");
  await wait(`!!document.querySelector('.versions-dialog[open]')`);
  assert.ok(
    await js(`document.querySelector('.versions-dialog').clientWidth > 900`),
    "Version previews need a wide dialog",
  );
  assert.equal(
    await js(`document.querySelectorAll('.version-entry').length`),
    0,
  );
  await capture("Avant rotation");
  await js(
    `document.querySelector('.versions-dialog button[aria-label="Fermer"]').click()`,
  );
  await pause();
  await click("Pivoter", ".page-actions button");
  await wait(
    `document.querySelector('.canvas-scroll .pdf-page').offsetWidth > document.querySelector('.canvas-scroll .pdf-page').offsetHeight`,
  );
  await click("Versions", "header button");
  await capture("Après rotation");
  assert.equal(
    await js(`document.querySelectorAll('.version-entry').length`),
    2,
  );
  await js(`document.querySelector('.version-select').click()`);
  await pause();
  await click("Comparer au document actuel");
  await wait(
    `document.querySelectorAll('.version-images img').length === 2 && !document.querySelector('.versions-dialog fieldset').disabled`,
  );
  assert.ok(
    await js(
      `!document.querySelector('.version-detail [role="status"]').textContent.includes('Aucune différence')`,
    ),
  );
  await click("Différences en rouge");
  await wait(`document.querySelectorAll('.version-images img').length === 1`);
  await fs.writeFile(
    path.join(__dirname, "../tmp/versions-comparison.png"),
    (await window.webContents.capturePage()).toPNG(),
  );
  await click("Restaurer cette version");
  await wait(
    `!document.querySelector('.versions-dialog') && document.querySelector('.canvas-scroll .pdf-page').offsetWidth < document.querySelector('.canvas-scroll .pdf-page').offsetHeight`,
  );
  await js(`document.querySelector('button[title="Annuler"]').click()`);
  await wait(
    `document.querySelector('.canvas-scroll .pdf-page').offsetWidth > document.querySelector('.canvas-scroll .pdf-page').offsetHeight`,
  );
  await js(`document.querySelector('button[title="Rétablir"]').click()`);
  await wait(
    `document.querySelector('.canvas-scroll .pdf-page').offsetWidth < document.querySelector('.canvas-scroll .pdf-page').offsetHeight`,
  );
  await click("Versions", "header button");
  await js(`document.querySelectorAll('.version-delete')[1].click()`);
  await pause();
  assert.equal(
    await js(`document.querySelectorAll('.version-entry').length`),
    1,
  );
  await click("Comparer au document actuel");
  await wait(
    `!!document.querySelector('.version-detail [role="status"]') && !document.querySelector('.versions-dialog fieldset').disabled`,
  );
  assert.ok(
    await js(
      `document.querySelector('.version-detail [role="status"]').textContent.includes('Aucune différence')`,
    ),
  );
  await js(
    `document.querySelector('.versions-dialog button[aria-label="Fermer"]').click()`,
  );
  await pause();
  console.log("Versions smoke OK");
};
