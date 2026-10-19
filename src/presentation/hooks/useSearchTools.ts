import { useEffect, useState } from "react";
import { useWorkbench } from "../WorkbenchContext";
import { useEditor } from "../EditorContext";
import {
  indexPdf,
  loadSearchIndex,
  saveSearchIndex,
  searchIndexedPdfs,
  type IndexedPdf,
} from "../../infrastructure/searchIndex";
export function useSearchTools() {
  const { execute, query:runQuery, download } = useWorkbench(),
    { load, selectPage } = useEditor(),
    [index, setIndex] = useState<IndexedPdf[]>([]),
    [query, setQuery] = useState("");
  useEffect(() => {
    let active = true;
    void runQuery(async () => {
      const result = await loadSearchIndex();
      if (active) setIndex(result);
    });
    return () => {
      active = false;
    };
  }, []);
  async function add(files: File[]) {
    await execute(async () => {
      const next = [...index];
      for (const file of files) {
        next.push(
          await indexPdf(new Uint8Array(await file.arrayBuffer()), file.name),
        );
      }
      await saveSearchIndex(next);
      setIndex(next);
    });
  }
  async function remove(id: string) {
    await execute(async () => {
      const next = index.filter((doc) => doc.id !== id);
      await saveSearchIndex(next);
      setIndex(next);
    });
  }
  async function open(id: string, page = 0) {
    const doc = index.find((d) => d.id === id);
    if (doc) {
      await load(
        new File([new Uint8Array(doc.bytes)], doc.name, {
          type: "application/pdf",
        }),
      );
      selectPage(page);
    }
  }
  const exportIndex = () =>
    execute(() =>
      download(
        "search-index.json",
        new TextEncoder().encode(
          JSON.stringify(
            index.map(({ id, name, pages }) => ({ id, name, pages })),
            null,
            2,
          ),
        ),
        "application/json",
      ),
    );
  return {
    index,
    query,
    setQuery,
    hits: searchIndexedPdfs(index, query),
    add,
    remove,
    open,
    exportIndex,
  };
}
