const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
const assets = path.join(root, "public/ocr");
copy(
  path.join(root, "node_modules/tesseract.js/dist/worker.min.js"),
  path.join(assets, "worker.min.js"),
);
copy(
  path.join(root, "node_modules/tesseract.js/dist/worker.min.js.LICENSE.txt"),
  path.join(assets, "worker.LICENSE.txt"),
);
copy(
  path.join(root, "node_modules/tesseract.js-core/LICENSE"),
  path.join(assets, "core.LICENSE.txt"),
);
for (const file of fs.readdirSync(
  path.join(root, "node_modules/tesseract.js-core"),
)) {
  if (/\.(wasm|js)$/.test(file) && file.startsWith("tesseract-core"))
    copy(
      path.join(root, "node_modules/tesseract.js-core", file),
      path.join(assets, file),
    );
}
for (const lang of ["eng", "fra"])
  copy(
    path.join(
      root,
      `node_modules/@tesseract.js-data/${lang}/4.0.0/${lang}.traineddata.gz`,
    ),
    path.join(assets, `${lang}.traineddata.gz`),
  );
console.log("Local OCR assets ready.");
copy(
  path.join(root, "src/assets/fonts/OFL.txt"),
  path.join(root, "public/fonts/OFL.txt"),
);
