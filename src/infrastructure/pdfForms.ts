import {
  PDFDocument,
  PDFName,
  PDFArray,
  PDFDict,
  PDFStream,
  PDFString,
  PDFHexString,
  type PDFObject,
} from "pdf-lib";

/** Rebuild the form root after copying pages: widgets retain their field parents. */
export function restoreFormRoot(pdf: PDFDocument) {
  const fields = pdf.context.obj([]);
  const fonts = pdf.context.obj({});
  const seen = new Set<string>();
  const widgets = new Set<string>();
  const names = new Set<string>();
  for (const page of pdf.getPages()) {
    for (const ref of page.node
      .lookupMaybe(PDFName.of("Annots"), PDFArray)
      ?.asArray() ?? []) {
      const annotation = pdf.context.lookup(ref, PDFDict);
      if (annotation.get(PDFName.of("Subtype")) === PDFName.of("Widget")) {
        widgets.add(ref.toString());
        annotation.set(PDFName.of("P"), page.ref);
      }
    }
  }
  function prune(ref: PDFObject, path = new Set<string>()): boolean {
    if (path.has(ref.toString())) throw new Error("Invalid cyclic form");
    const field = pdf.context.lookup(ref, PDFDict);
    if (field.get(PDFName.of("Subtype")) === PDFName.of("Widget"))
      return widgets.has(ref.toString());
    const kids = field.lookupMaybe(PDFName.of("Kids"), PDFArray);
    if (!kids) return false;
    const nextPath = new Set(path).add(ref.toString());
    const kept = kids.asArray().filter((child) => prune(child, nextPath));
    field.set(PDFName.of("Kids"), pdf.context.obj(kept));
    return !!kept.length;
  }
  for (const page of pdf.getPages()) {
    const annotations = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annotations) continue;
    for (const ref of annotations.asArray()) {
      let field = pdf.context.lookup(ref, PDFDict);
      if (field.get(PDFName.of("Subtype")) !== PDFName.of("Widget")) continue;
      const appearance = field.lookupMaybe(PDFName.of("AP"), PDFDict);
      const normal = pdf.context.lookup(appearance?.get(PDFName.of("N")));
      if (normal instanceof PDFStream) {
        const resources = normal.dict.lookupMaybe(
          PDFName.of("Resources"),
          PDFDict,
        );
        const appearanceFonts = resources?.lookupMaybe(
          PDFName.of("Font"),
          PDFDict,
        );
        for (const [name, value] of appearanceFonts?.entries() ?? [])
          fonts.set(name, value);
      }
      let root = ref;
      const ancestors = new Set<string>();
      while (field.has(PDFName.of("Parent"))) {
        if (ancestors.has(root.toString()))
          throw new Error("Invalid cyclic form");
        ancestors.add(root.toString());
        root = field.get(PDFName.of("Parent"))!;
        field = pdf.context.lookup(root, PDFDict);
      }
      const key = root.toString();
      if (!seen.has(key)) {
        seen.add(key);
        if (!prune(root)) continue;
        const title = field.get(PDFName.of("T"));
        if (title instanceof PDFString || title instanceof PDFHexString) {
          const name = title.decodeText();
          let unique = name,
            n = 2;
          while (names.has(unique)) unique = `${name}_copy${n++}`;
          if (unique !== name)
            field.set(PDFName.of("T"), PDFHexString.fromText(unique));
          names.add(unique);
        }
        fields.push(root);
      }
    }
  }
  if (fields.size()) {
    const form =
      pdf.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict) ??
      pdf.context.obj({});
    form.set(PDFName.of("Fields"), fields);
    const resources =
      form.lookupMaybe(PDFName.of("DR"), PDFDict) ?? pdf.context.obj({});
    const existing =
      resources.lookupMaybe(PDFName.of("Font"), PDFDict) ?? pdf.context.obj({});
    for (const [name, value] of fonts.entries())
      if (!existing.has(name)) existing.set(name, value);
    resources.set(PDFName.of("Font"), existing);
    form.set(PDFName.of("DR"), resources);
    pdf.catalog.set(PDFName.of("AcroForm"), form);
  }
}
