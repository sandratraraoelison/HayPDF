import { useEffect, useRef, useState } from "react";
import type { DocumentModel } from "../../domain/document";
import {
  captureVersion,
  type DocumentVersion,
} from "../../domain/documentVersions";
import { exportDocument } from "../../infrastructure/pdfEngine";
import {
  comparePdfPages,
  type PdfComparison,
} from "../../infrastructure/pdfComparison";

interface Options {
  doc?: DocumentModel;
  pageIndex: number;
  commit: (doc: DocumentModel) => void;
  run: (action: () => Promise<void>) => Promise<void>;
  setNotice: (message: string, tone?: "info" | "success") => void;
  t: (message: string) => string;
}

export function useDocumentVersions({
  doc,
  pageIndex,
  commit,
  run,
  setNotice,
  t,
}: Options) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const [comparison, setComparison] = useState<{
    source: DocumentModel;
    versionId: string;
    pageIndex: number;
    result: PdfComparison;
  }>();
  const [images, setImages] = useState<string[]>([]);
  const generation = useRef(0);
  const selectedVersion = versions.find(
    (version) => version.id === selectedVersionId,
  );
  const result =
    comparison?.source === doc &&
    comparison?.versionId === selectedVersionId &&
    comparison?.pageIndex === pageIndex
      ? comparison.result
      : undefined;

  useEffect(() => {
    setImages([]);
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

  function resetVersions() {
    generation.current++;
    setVersions([]);
    setSelectedVersionId(undefined);
    setComparison(undefined);
    setVersionName("");
    setShowVersions(false);
  }
  function saveVersion() {
    if (!doc) return;
    const version = captureVersion(
      doc,
      versionName.trim() || `${t("Version")} ${versions.length + 1}`,
    );
    setVersions((current) => [...current, version]);
    setSelectedVersionId(version.id);
    setVersionName("");
    setComparison(undefined);
  }
  function removeVersion(id: string) {
    generation.current++;
    setVersions((current) => current.filter((version) => version.id !== id));
    if (selectedVersionId === id) {
      setSelectedVersionId(undefined);
      setComparison(undefined);
    }
  }
  function restoreVersion() {
    if (!selectedVersion) return;
    commit(selectedVersion.document);
    setComparison(undefined);
    setShowVersions(false);
    setNotice(
      t("Version restaurée. Vous pouvez annuler cette action."),
      "success",
    );
  }
  async function compareVersion() {
    if (!doc || !selectedVersion) return;
    const request = ++generation.current;
    setComparison(undefined);
    await run(async () => {
      const [before, after] = await Promise.all([
        exportDocument(selectedVersion.document),
        exportDocument(doc),
      ]);
      const result = comparePdfPages(before, after, pageIndex);
      if (generation.current === request)
        setComparison({
          source: doc,
          versionId: selectedVersion.id,
          pageIndex,
          result,
        });
    });
  }
  return {
    openVersions: () => {
      setNotice("");
      setShowVersions(true);
    },
    versions,
    showVersions,
    setShowVersions,
    versionName,
    setVersionName,
    selectedVersion,
    selectedVersionId,
    setSelectedVersionId,
    saveVersion,
    removeVersion,
    restoreVersion,
    compareVersion,
    resetVersions,
    versionComparison: result,
    versionImages: result ? images : [],
  };
}
