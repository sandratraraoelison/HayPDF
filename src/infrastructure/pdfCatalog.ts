import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFArray,
  PDFObjectCopier,
  PDFHexString,
  PDFString,
  type PDFObject,
} from "pdf-lib";

/** Document-level attachments must survive page copies and merges. */
export function preserveCatalog(output: PDFDocument, sources: PDFDocument[]) {
  const first = sources[0];
  if (!first) return;
  if (first.getTitle()) output.setTitle(first.getTitle()!);
  if (first.getAuthor()) output.setAuthor(first.getAuthor()!);
  if (first.getSubject()) output.setSubject(first.getSubject()!);
  const files = new Map<string, PDFObject>();
  const scripts = new Map<string, PDFObject>();
  for (const source of sources) {
    const copier = PDFObjectCopier.for(source.context, output.context);
    const names = source.catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
    const root = names?.lookupMaybe(PDFName.of("EmbeddedFiles"), PDFDict);
    const visit = (node: PDFDict, path = new Set<PDFDict>(), store = files) => {
      if (path.has(node)) throw new Error("Invalid name tree");
      const next = new Set(path).add(node);
      const entries = node.lookupMaybe(PDFName.of("Names"), PDFArray);
      if (entries)
        for (let i = 0; i + 1 < entries.size(); i += 2) {
          const key = entries.lookup(i);
          if (!(key instanceof PDFString || key instanceof PDFHexString))
            continue;
          const name = key.decodeText();
          let unique = name,
            n = 2;
          while (store.has(unique)) unique = `${n++}-${name}`;
          store.set(unique, copier.copy(entries.get(i + 1)));
        }
      for (const child of node
        .lookupMaybe(PDFName.of("Kids"), PDFArray)
        ?.asArray() ?? [])
        visit(source.context.lookup(child, PDFDict), next, store);
    };
    if (root) visit(root);
    const scriptRoot = names?.lookupMaybe(PDFName.of("JavaScript"), PDFDict);
    if (scriptRoot) visit(scriptRoot, new Set(), scripts);
    const language = source.catalog.get(PDFName.of("Lang"));
    if (language && !output.catalog.has(PDFName.of("Lang")))
      output.catalog.set(PDFName.of("Lang"), copier.copy(language));
  }
  if (files.size || scripts.size)
    output.catalog.set(
      PDFName.of("Names"),
      output.context.obj({
        ...(scripts.size
          ? {
              JavaScript: {
                Names: [...scripts.entries()]
                  .sort(([a], [b]) => a.localeCompare(b))
                  .flatMap(([name, value]) => [
                    PDFHexString.fromText(name),
                    value,
                  ]),
              },
            }
          : {}),
        EmbeddedFiles: {
          Names: [...files.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .flatMap(([name, value]) => [PDFHexString.fromText(name), value]),
        },
      }),
    );
}
