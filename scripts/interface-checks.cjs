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
