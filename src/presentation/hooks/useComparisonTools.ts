import { useEffect, useState } from "react";
import { useEditor } from "../EditorContext";
import { useWorkbench } from "../WorkbenchContext";
import { exportDocument } from "../../infrastructure/pdfEngine";
import {
  comparePdfPages,
  type PdfComparison,
} from "../../infrastructure/pdfComparison";
export function useComparisonTools() {
  const { doc } = useEditor(),
    { execute, download } = useWorkbench(),
    [file, setFile] = useState<File>(),
    [page, setPage] = useState(1),
    [result, setResult] = useState<PdfComparison>();
  const [images, setImages] = useState<string[]>([]);
  useEffect(() => {
    if (!result) return;
    const urls = [
      result.leftImage,
      result.rightImage,
      result.differenceImage,
    ].map((bytes) =>
      URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: "image/png" }),
      ),
    );
    setImages(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [result]);
  async function compare() {
    if (doc && file)
      await execute(async () =>
        setResult(
          comparePdfPages(
            await exportDocument(doc),
            new Uint8Array(await file.arrayBuffer()),
            page - 1,
          ),
        ),
      );
  }
  const report = () =>
    execute(async () => {
      if (result)
        await download(
          "comparison.json",
          new TextEncoder().encode(
            JSON.stringify(
              {
                ...result,
                leftImage: undefined,
                rightImage: undefined,
                differenceImage: undefined,
              },
              null,
              2,
            ),
          ),
          "application/json",
        );
    });
  return { file, setFile, page, setPage, result, images, compare, report };
}
