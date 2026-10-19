const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

module.exports = async function checkShapes(window) {
  const js = (code) => window.webContents.executeJavaScript(code);
  async function wait(expression) {
    for (let i = 0; i < 100; i++) {
      if (await js(expression)) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Shape UI timeout: " + expression);
  }
  await js(`document.querySelectorAll('.sidebar-tabs button')[1].click()`);
  await js(
    `([...document.querySelectorAll('.tools button')].find(b=>b.textContent.trim()==='Forme')).click()`,
  );
  await wait(
    `document.querySelectorAll('.shape-dropdown .shape-grid button').length === 12`,
  );
  await js(
    `document.querySelector('.shape-dropdown button[title="Étoile"]').click()`,
  );
  await js(
    `(() => {const page=document.querySelector('.canvas-scroll .pdf-page');const rect=page.getBoundingClientRect();page.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:rect.left+40,clientY:rect.top+60}));})()`,
  );
  await wait(`!!document.querySelector('.canvas-scroll .mark.rectangle .shape-preview path')`);
  const star = await js(
    `document.querySelector('.canvas-scroll .mark.rectangle .shape-preview path').getAttribute('d')`,
  );
  assert.equal(
    await js(
      `document.querySelectorAll('.canvas-scroll .mark.rectangle .image-resize-handle').length`,
    ),
    8,
  );
  await js(
    `document.querySelector('.shape-grid button[title="Ellipse"]').click()`,
  );
  await wait(
    `document.querySelector('.canvas-scroll .mark.rectangle .shape-preview path').getAttribute('d').includes('C')`,
  );
  await fs.writeFile(
    path.join(__dirname, "../tmp/interface-shapes.png"),
    (await window.webContents.capturePage()).toPNG(),
  );
  await js(`document.querySelector('button[title="Annuler"]').click()`);
  await wait(
    `document.querySelector('.canvas-scroll .mark.rectangle .shape-preview path').getAttribute('d') === ${JSON.stringify(star)}`,
  );
  // Opening the shape chooser must also work while an existing element is selected.
  await js(
    `([...document.querySelectorAll('.tools button')].find(b=>b.textContent.trim()==='Forme')).click()`,
  );
  await wait(`!!document.querySelector('.shape-dropdown')`);
  await fs.writeFile(
    path.join(__dirname, "../tmp/interface-shape-dropdown.png"),
    (await window.webContents.capturePage()).toPNG(),
  );
  await js(
    `document.querySelector('.shape-dropdown button[title="Tracé libre"]').click()`,
  );
  await wait(`!!document.querySelector('.freehand-layer')`);
  const bounds = await js(
    `(() => { const r=document.querySelector('.freehand-layer').getBoundingClientRect(); return {x:Math.round(r.left+60),y:Math.round(r.top+160)}; })()`,
  );
  const pause = () => new Promise((resolve) => setTimeout(resolve, 60));
  window.webContents.sendInputEvent({
    type: "mouseDown",
    x: bounds.x,
    y: bounds.y,
    button: "left",
    clickCount: 1,
  });
  for (const [dx, dy] of [
    [20, 20],
    [40, -15],
    [65, 30],
    [100, 0],
  ]) {
    await pause();
    window.webContents.sendInputEvent({
      type: "mouseMove",
      x: bounds.x + dx,
      y: bounds.y + dy,
    });
  }
  window.webContents.sendInputEvent({
    type: "mouseUp",
    x: bounds.x + 100,
    y: bounds.y,
    button: "left",
    clickCount: 1,
  });
  await wait(`document.querySelectorAll('.canvas-scroll .mark.rectangle').length === 2`);
  const freehand = await js(
    `document.querySelectorAll('.canvas-scroll .mark.rectangle .shape-preview path')[1].getAttribute('d')`,
  );
  assert.ok(
    freehand.split("L").length >= 4,
    "Freehand must retain the drawn trajectory",
  );
  await js(`document.querySelector('button[title="Annuler"]').click()`);
  await wait(`document.querySelectorAll('.canvas-scroll .mark.rectangle').length === 1`);
  await js(`document.querySelector('button[title="Rétablir"]').click()`);
  await wait(`document.querySelectorAll('.canvas-scroll .mark.rectangle').length === 2`);
  window.webContents.sendInputEvent({
    type: "mouseDown",
    x: bounds.x,
    y: bounds.y,
    button: "left",
    clickCount: 1,
  });
  await pause();
  window.webContents.sendInputEvent({
    type: "mouseMove",
    x: bounds.x + 50,
    y: bounds.y + 50,
  });
  window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
  await pause();
  window.webContents.sendInputEvent({
    type: "mouseUp",
    x: bounds.x + 50,
    y: bounds.y + 50,
    button: "left",
    clickCount: 1,
  });
  await pause();
  assert.equal(
    await js(`document.querySelectorAll('.canvas-scroll .mark.rectangle').length`),
    2,
  );
  await js(
    `([...document.querySelectorAll('.tools button')].find(b=>b.textContent.trim()==='Sélection')).click()`,
  );
  await fs.writeFile(
    path.join(__dirname, "../tmp/interface-freehand.png"),
    (await window.webContents.capturePage()).toPNG(),
  );
  console.log(
    "Shapes smoke OK (picker, creation, resizing handles, editing, undo)",
  );
};
