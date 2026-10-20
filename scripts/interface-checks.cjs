const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

module.exports = async function checkInterface(window) {
  const js = (code) => window.webContents.executeJavaScript(code);
  const pause = () => new Promise((resolve) => setTimeout(resolve, 120));
  const screenshot = async (name) => {
    await fs.mkdir(path.join(__dirname, "../tmp"), { recursive: true });
    await fs.writeFile(
      path.join(__dirname, "../tmp", name),
      (await window.webContents.capturePage()).toPNG(),
    );
  };
  const metadata = require("../package.json");
  await js(`document.querySelector('.document-menu-trigger').click()`);
  await pause();
  assert.ok(await js(`!!document.querySelector('.document-menu')`));
  assert.ok(
    await js(
      `document.querySelector('.document-menu-trigger').getBoundingClientRect().left < 80`,
    ),
  );
  assert.ok(
    await js(
      `[...document.querySelectorAll('.document-menu button')].find(b=>b.textContent.trim()==='Exporter le PDF').disabled`,
    ),
  );
  await screenshot("interface-file-menu.png");
  await js(
    `[...document.querySelectorAll('.document-menu button')].find(b=>b.textContent.trim()==='Nouveau document').click()`,
  );
  await pause();
  assert.ok(
    await js(
      `!!document.querySelector('.document-tool-dialog[open]') && !document.querySelector('.document-menu')`,
    ),
  );
  await js(`document.querySelector('.document-tool-dialog').close()`);
  await pause();
  await js(`document.querySelector('.document-menu-trigger').click()`);
  await pause();
  await js(
    `(() => {const input=document.querySelector('input[accept="application/pdf"]');const original=input.click;window.__menuOpenedPdf=false;input.click=()=>window.__menuOpenedPdf=true;[...document.querySelectorAll('.document-menu button')].find(b=>b.textContent.trim()==='Ouvrir un PDF').click();input.click=original;})()`,
  );
  assert.equal(await js(`window.__menuOpenedPdf`), true);
  await pause();
  await js(`document.querySelector('.document-menu-trigger').click()`);
  await pause();
  await js(
    `[...document.querySelectorAll('.document-menu button')].find(b=>b.textContent.trim()==='Raccourcis clavier').click()`,
  );
  await pause();
  assert.ok(await js(`!!document.querySelector('.shortcut-help[open]')`));
  await js(`document.querySelector('.shortcut-help').close()`);
  await pause();
  await js(`document.querySelector('.about-button').click()`);
  await pause();
  assert.ok(await js(`!!document.querySelector('.about-dialog[open]')`));
  assert.ok(
    (await js(`document.querySelector('.about-version').textContent`)).includes(
      metadata.version,
    ),
  );
  assert.ok(
    await js(
      `document.querySelectorAll('.about-features article').length >= 8 && document.querySelector('.about-dialog').textContent.includes('Microsoft Word (.docx)') && document.querySelector('.about-dialog').textContent.includes('Microsoft Excel (.xlsx)')`,
    ),
  );
  assert.equal(
    await js(`document.querySelector('.about-contact').getAttribute('href')`),
    `mailto:${metadata.author.email}`,
  );
  assert.ok(
    (
      await js(`document.querySelector('.about-footer small').textContent`)
    ).includes(metadata.author.name),
  );
  assert.ok(
    await js(
      `document.querySelector('.about-heading img').complete && document.querySelector('.about-heading img').naturalWidth > 0`,
    ),
  );
  await screenshot("interface-about.png");
  await js(`document.querySelector('.about-heading button').click()`);
  await pause();
  await js(
    `(() => {const select=document.querySelector('.language-select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'en');select.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await pause();
  await js(`document.querySelector('.about-button').click()`);
  await pause();
  assert.ok(
    await js(
      `document.querySelector('#about-title').textContent === 'About HayPDF' && document.querySelector('.about-dialog').textContent.includes('Available features') && document.querySelector('.about-footer').textContent.includes('Created by')`,
    ),
  );
  await js(`document.querySelector('.about-heading button').click()`);
  await pause();
  await js(
    `(() => {const select=document.querySelector('.language-select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'fr');select.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await pause();
  assert.equal(
    await js(
      `document.querySelectorAll('.properties input, .properties textarea, .properties select').length`,
    ),
    0,
  );
  assert.equal(
    await js(`document.querySelectorAll('.viewbar button').length`),
    0,
  );
  assert.ok(
    await js(
      `[...document.querySelectorAll('.tools button')].every(button => button.disabled)`,
    ),
  );
  assert.equal(
    await js(`document.querySelector('.dropzone [role="button"]')`),
    null,
  );
  await screenshot("interface-welcome.png");
  await js(`document.querySelectorAll('.sidebar-tabs button')[2].click()`);
  await pause();
  async function search(value) {
    await js(
      `(() => {const input=document.querySelector('#tool-search');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );
    await pause();
  }
  await search("accessibilite");
  assert.equal(
    await js(
      `document.querySelectorAll('.tools-catalog section button').length`,
    ),
    1,
  );
  assert.ok(
    await js(
      `document.querySelector('.tools-catalog section button').textContent.includes('accessibilité')`,
    ),
  );
  await search("outil introuvable xyz");
  assert.equal(
    await js(
      `document.querySelectorAll('.tools-catalog section button').length`,
    ),
    0,
  );
  assert.ok(
    await js(
      `document.querySelector('.catalog-results').textContent.includes('Aucun outil')`,
    ),
  );
  await js(`document.querySelector('.catalog-search-field button').click()`);
  await pause();
  assert.ok(
    await js(
      `document.querySelectorAll('.tools-catalog section button').length > 20`,
    ),
  );
  await screenshot("interface-tools.png");
  const searchTop = await js(
    `document.querySelector('.catalog-search').getBoundingClientRect().top`,
  );
  await js(`document.querySelector('.catalog-items').scrollTop = 175`);
  await pause();
  assert.ok(await js(`document.querySelector('.catalog-items').scrollTop > 0`));
  assert.equal(
    await js(
      `document.querySelector('.catalog-search').getBoundingClientRect().top`,
    ),
    searchTop,
  );
  assert.ok(
    await js(`(() => {
    const search = document.querySelector('.catalog-search');
    const rect = search.getBoundingClientRect();
    const list = document.querySelector('.catalog-items').getBoundingClientRect();
    return list.top >= rect.bottom && search.contains(document.elementFromPoint(rect.left + 4, rect.top + 2));
  })()`),
    "Scrolling tools must remain clipped below the fixed search field",
  );
  await screenshot("interface-tools-scrolled.png");
  await js(`document.querySelector('.catalog-items').scrollTop = 0`);
  await js(`document.querySelector('.theme-toggle').click()`);
  await pause();
  await screenshot("interface-light.png");
  window.setSize(1100, 760);
  await pause();
  assert.ok(
    await js(`document.documentElement.scrollWidth <= window.innerWidth`),
    "The interface must not overflow horizontally at 1100px",
  );
  assert.ok(
    await js(
      `document.querySelector('main').getBoundingClientRect().width >= 300`,
    ),
  );
  await screenshot("interface-compact.png");
  window.setSize(1440, 960);
  await js(
    `document.querySelector('.theme-toggle').click();document.querySelectorAll('.sidebar-tabs button')[1].click()`,
  );
  await pause();
  console.log("Interface checks OK");
};
