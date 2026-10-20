import { useEffect, useRef, useState } from "react";
import { usePreferences } from "../../application/usePreferences";
import { useDocument } from "../../application/useDocument";
import { replaceNativeText } from "../../application/replaceNativeText";
import { recognizePage } from "../../infrastructure/ocrEngine";
import { exportDocument } from "../../infrastructure/pdfEngine";
import { savePdf } from "../../infrastructure/fileGateway";

import {
  uid,
  type Mark,
  type Tool,
  type NativeText,
} from "../../domain/document";
import { useEditorShortcuts } from "./useEditorShortcuts";
import { useEditorZoom } from "./useEditorZoom";
import {
  describeOperationError,
  type OperationError,
} from "../../application/operationError";
import { readReplacementFont } from "../../infrastructure/replacementFontFile";
import { readImageFile } from "../../infrastructure/imageFile";
import type { Rect } from "../../domain/imageLayout";
import { useAdvancedTools } from "./useAdvancedTools";
import { usePdfOpening } from "./usePdfOpening";
import { useDocumentTools } from "./useDocumentTools";
import type { DocumentModel } from "../../domain/document";
import { useDocumentVersions } from "./useDocumentVersions";
import { useNativeImages } from "./useNativeImages";
import { useTableEditor } from "./useTableEditor";
import { useGraphEditor } from "./useGraphEditor";
import { useImageEditing } from "./useImageEditing";
import type { NativeImage } from "../../domain/nativeImage";
import {
  normalizeStroke,
  type ShapeKind,
  type StrokePoint,
} from "../../domain/shapes";
export function useEditorController() {
  const { scale, setScale, canvasScroll, zoom, fit, wheelZoom } =
    useEditorZoom();
  const { language, setLanguage, theme, setTheme, t } = usePreferences();

  const [nativeBlock, setNativeBlock] = useState<NativeText>();
  const [shape, setShape] = useState<ShapeKind>("rectangle");
  const [operationError, setOperationError] = useState<OperationError>();
  const [noticeTone, setNoticeTone] = useState<"info" | "success">("info");
  const [replacementFont, setReplacementFont] = useState<{
    bytes: Uint8Array;
    name: string;
    forFont: string;
  }>();
  const fontInput = useRef<HTMLInputElement>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const [replacement, setReplacement] = useState("");
  const [ocrProgress, setOcrProgress] = useState<number>();
  const { doc, open, commit, undo, redo, canUndo, canRedo } = useDocument();
  const [requestedPageIndex, setPageIndex] = useState(0),
    [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<string>(),
    [text, setText] = useState(t("Votre texte")),
    [size, setSize] = useState(18),
    [color, setColor] = useState("#393454"),
    [font, setFont] = useState<Mark["font"]>("Helvetica");
  const [busy, setBusy] = useState(false),
    [notice, writeNotice] = useState(""),
    [image, setImage] = useState<{
      data: string;
      width: number;
      height: number;
    }>();
  const input = useRef<HTMLInputElement>(null),
    mergeInput = useRef<HTMLInputElement>(null),
    imageInput = useRef<HTMLInputElement>(null);
  const pageIndex = Math.max(
    0,
    Math.min(requestedPageIndex, (doc?.pages.length ?? 1) - 1),
  );
  const page = doc?.pages[pageIndex];
  const mark = page?.marks.find((m) => m.id === selected);
  function setNotice(message: string, tone: "info" | "success" = "info") {
    setOperationError(undefined);
    setNoticeTone(tone);
    writeNotice(message);
  }
  function clearActionInfo() {
    if (!operationError && noticeTone === "info") setNotice("");
  }
  useEffect(() => {
    if (!notice || noticeTone !== "success" || operationError) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice, noticeTone, operationError]);
  useEffect(() => {
    setNativeBlock(undefined);
  }, [page?.id, tool]);
  useEffect(() => {
    setText((value) =>
      value === "Votre texte" || value === "Your text"
        ? t("Votre texte")
        : value,
    );
  }, [language]);
  const activeOperations = useRef(0);
  async function run(action: () => Promise<void>, preserveNotice = false) {
    activeOperations.current++;
    setBusy(true);
    if (!preserveNotice) setNotice("");
    try {
      await action();
    } catch (e) {
      console.error(e);
      const error = describeOperationError(e, t);
      setNotice(error.summary);
      setOperationError(error);
    } finally {
      activeOperations.current--;
      setBusy(activeOperations.current > 0);
    }
  }
  function resetSession(next: DocumentModel) {
    versionTools.resetVersions();
    open(next);
    setPageIndex(0);
    setSelected(undefined);
    setReplacementFont(undefined);
    setTool("select");
  }
  const versionTools = useDocumentVersions({
    doc,
    pageIndex,
    commit: (next) => {
      commit(next);
      setSelected(undefined);
      setNativeBlock(undefined);
      setTool("select");
    },
    run,
    setNotice,
    t,
  });
  const opening = usePdfOpening({ doc, commit, onOpened: resetSession, run });
  function updateMark(changes: Partial<Mark>) {
    if (doc && page && selected) {
      if (mark?.kind === "image" && mark.lockAspectRatio !== false) {
        if (changes.width !== undefined && changes.height === undefined)
          changes = {
            ...changes,
            height: (changes.width * mark.height) / mark.width,
          };
        if (changes.height !== undefined && changes.width === undefined)
          changes = {
            ...changes,
            width: (changes.height * mark.width) / mark.height,
          };
      }
      commit({
        ...doc,
        pages: doc.pages.map((p) =>
          p.id === page.id
            ? {
                ...p,
                marks: p.marks.map((m) =>
                  m.id === selected ? { ...m, ...changes } : m,
                ),
              }
            : p,
        ),
      });
      clearActionInfo();
    }
  }
  function place(x: number, y: number) {
    if (tool === "rectangle" && shape === "freehand") return;
    if (!doc || !page || tool === "select" || tool === "native") {
      setSelected(undefined);
      setNativeBlock(undefined);
      nativeImages.selectImage(undefined);
      return;
    }
    if (tool === "image" && !image) {
      imageInput.current?.click();
      return;
    }
    const next: Mark = {
      id: uid(),
      kind: tool,
      shape: tool === "rectangle" ? shape : undefined,
      x,
      y,
      width: tool === "image" ? 160 : 220,
      height: tool === "image" ? 100 : tool === "rectangle" ? 80 : size * 1.5,
      text:
        tool === "stamp"
          ? t("APPROUVÉ")
          : tool === "signature"
            ? t("Votre signature")
            : text,
      size,
      color,
      font,
      data: tool === "image" ? image?.data : undefined,
    };
    if (tool === "image" && image) {
      const sheet =
        canvasScroll.current?.querySelector<HTMLElement>(".pdf-page");
      const factor = Math.min(
        240 / image.width,
        220 / image.height,
        (sheet ? sheet.offsetWidth / scale : 240) / image.width,
        (sheet ? sheet.offsetHeight / scale : 220) / image.height,
        1,
      );
      next.width = image.width * factor;
      next.height = image.height * factor;
      if (sheet) {
        next.x = Math.max(
          0,
          Math.min(x, sheet.offsetWidth / scale - next.width),
        );
        next.y = Math.max(
          0,
          Math.min(y, sheet.offsetHeight / scale - next.height),
        );
      }
      next.imageFit = "contain";
      next.lockAspectRatio = true;
      next.naturalWidth = image.width;
      next.naturalHeight = image.height;
    }
    commit({
      ...doc,
      pages: doc.pages.map((p) =>
        p.id === page.id ? { ...p, marks: [...p.marks, next] } : p,
      ),
    });
    setSelected(next.id);
    setTool("select");
    clearActionInfo();
  }
  function pageAction(action: "rotate" | "delete" | "up" | "down") {
    if (!doc || !page) return;
    const index = doc.pages.indexOf(page);
    const pages = [...doc.pages];
    if (action === "rotate") {
      if (page.marks.length) {
        setNotice(
          t(
            "Pour pivoter cette page, retirez ses éléments ajoutés ou annulez leur ajout.",
          ),
        );
        return;
      }
      pages[index] = { ...page, rotation: (page.rotation + 90) % 360 };
    }
    if (action === "delete") {
      if (pages.length === 1) return;
      pages.splice(index, 1);
      setPageIndex(Math.max(0, index - 1));
    }
    const target =
      action === "up" ? index - 1 : action === "down" ? index + 1 : -1;
    if (
      (action === "up" || action === "down") &&
      target >= 0 &&
      target < pages.length
    ) {
      [pages[index], pages[target]] = [pages[target], pages[index]];
      setPageIndex(target);
    }
    commit({ ...doc, pages });
    setSelected(undefined);
    clearActionInfo();
  }
  async function save(single = false) {
    if (!doc || !page) return;
    await run(async () => {
      const bytes = await exportDocument(doc, single ? [page] : undefined);
      const saved = await savePdf(
        single
          ? `page-${pageIndex + 1}.pdf`
          : doc.name.replace(/\.pdf$/i, "") + "-modifie.pdf",
        bytes,
      );
      if (saved)
        setNotice(t("Votre PDF a été exporté avec succès."), "success");
    });
  }
  async function applyNative() {
    if (!doc || !nativeBlock) return;
    await run(async () => {
      if (!page) return;
      commit(
        await replaceNativeText(
          doc,
          doc.pages.indexOf(page),
          nativeBlock,
          replacement,
          { font, size, color },
          {
            fontData:
              replacementFont?.forFont === (nativeBlock.fontName ?? "")
                ? replacementFont?.bytes
                : undefined,
          },
        ),
      );
      setNativeBlock(undefined);
      setSelected(undefined);
      setTool("select");
      setNotice(t("Remplacement effectué."), "success");
    });
  }
  async function ocr() {
    if (!doc || !page) return;
    setOcrProgress(0);
    await run(async () => {
      const marks = await recognizePage(doc, page, setOcrProgress);
      if (!marks.length) {
        setNotice(t("Aucun texte reconnu sur cette page."));
        return;
      }
      commit({
        ...doc,
        pages: doc.pages.map((p) =>
          p.id === page.id
            ? {
                ...p,
                marks: [...p.marks.filter((m) => !m.invisible), ...marks],
              }
            : p,
        ),
      });
      setNotice(
        t("OCR terminé. Vous pouvez corriger les lignes reconnues."),
        "success",
      );
    });
    setOcrProgress(undefined);
  }
  function deleteSelected() {
    if (!doc || !page || !selected) return;
    commit({
      ...doc,
      pages: doc.pages.map((p) =>
        p.id === page.id
          ? { ...p, marks: p.marks.filter((m) => m.id !== selected) }
          : p,
      ),
    });
    setSelected(undefined);
  }

  useEditorShortcuts({
    busy,
    hasDocument: !!doc,
    canUndo,
    canRedo,
    pageIndex: page ? doc!.pages.indexOf(page) : 0,
    pageCount: doc?.pages.length ?? 0,
    mark,
    open: () => input.current?.click(),
    save: () => {
      void save();
    },
    undo,
    redo,
    escape: () => {
      nativeImages.selectImage(undefined);
      setSelected(undefined);
      setNativeBlock(undefined);
      setNotice("");
      setTool("select");
    },
    help: () => setShowShortcuts(true),
    zoom,
    actualSize: () => setScale(1),
    fit,
    wheelZoom,
    selectPage,
    deleteSelected,
    chooseTool,
    updateMark,
  });

  function chooseTool(next: Tool) {
    if (imageEditing.selecting) imageEditing.cancel();
    if (tableEditor.selecting) tableEditor.cancel();
    if (graphEditor.selecting) graphEditor.cancel();
    clearActionInfo();
    nativeImages.selectImage(undefined);
    setSelected(undefined);
    setNativeBlock(undefined);
    setTool(next);
    if (next === "image") imageInput.current?.click();
  }
  function chooseShape(value: ShapeKind, editSelected = false) {
    if (imageEditing.selecting) imageEditing.cancel();
    if (tableEditor.selecting) tableEditor.cancel();
    if (graphEditor.selecting) graphEditor.cancel();
    nativeImages.selectImage(undefined);
    setShape(value);
    if (editSelected && value !== "freehand" && mark?.kind === "rectangle") {
      updateMark({ shape: value, points: undefined });
    } else {
      setSelected(undefined);
      setTool("rectangle");
    }
  }
  function drawFreehand(points: StrokePoint[]) {
    if (!doc || !page || busy) return;
    const stroke = normalizeStroke(points);
    if (!stroke) return;
    const next: Mark = {
      id: uid(),
      kind: "rectangle",
      shape: "freehand",
      ...stroke,
      text: "",
      font,
      size,
      color,
    };
    commit({
      ...doc,
      pages: doc.pages.map((p) =>
        p.id === page.id ? { ...p, marks: [...p.marks, next] } : p,
      ),
    });
    setSelected(next.id);
    clearActionInfo();
  }
  function selectPage(index: number) {
    clearActionInfo();
    setPageIndex(index);
    setSelected(undefined);
  }
  function selectMark(id: string) {
    clearActionInfo();
    setNativeBlock(undefined);
    nativeImages.selectImage(undefined);
    setSelected(id);
    setTool("select");
  }
  function selectNativeBlock(block: NativeText) {
    clearActionInfo();
    nativeImages.selectImage(undefined);
    setNativeBlock(block);
    setReplacement(block.text);
    setSize(block.size);
    setFont(block.font ?? "Helvetica");
    setColor(block.color ?? "#000000");
    setSelected(undefined);
  }
  function selectNativeImage(image?: NativeImage) {
    clearActionInfo();
    setSelected(undefined);
    setNativeBlock(undefined);
    nativeImages.selectImage(image);
    if (image) nativeImages.setEnabled(true);
  }
  function moveMark(id: string, x: number, y: number) {
    if (doc && page) {
      commit({
        ...doc,
        pages: doc.pages.map((p) =>
          p.id === page.id
            ? {
                ...p,
                marks: p.marks.map((m) => (m.id === id ? { ...m, x, y } : m)),
              }
            : p,
        ),
      });
      clearActionInfo();
    }
  }
  function resizeMark(id: string, rect: Rect) {
    if (!doc || !page) return;
    commit({
      ...doc,
      pages: doc.pages.map((p) =>
        p.id === page.id
          ? {
              ...p,
              marks: p.marks.map((m) => (m.id === id ? { ...m, ...rect } : m)),
            }
          : p,
      ),
    });
    clearActionInfo();
  }
  function updateOcrText(id: string, value: string) {
    if (doc && page)
      commit({
        ...doc,
        pages: doc.pages.map((p) =>
          p.id === page.id
            ? {
                ...p,
                marks: p.marks.map((m) =>
                  m.id === id ? { ...m, text: value } : m,
                ),
              }
            : p,
        ),
      });
  }
  async function loadImage(file?: File) {
    if (!file) return;
    await run(async () => {
      setImage(await readImageFile(file));
      setTool("image");
      setNotice(t("Cliquez sur la page pour placer votre image."));
    });
  }
  async function loadFont(file?: File) {
    if (!file || !nativeBlock) return;
    const forFont = nativeBlock.fontName ?? "";
    await run(async () => {
      const loaded = await readReplacementFont(file);
      setReplacementFont({ ...loaded, forFont });
      setNotice(t("Police chargée. Relancez le remplacement."), "success");
    });
  }
  const advanced = useAdvancedTools({
    doc,
    pageIndex,
    commit,
    run,
    setNotice,
    t,
  });
  const documentTools = useDocumentTools({
    doc,
    pageIndex,
    commit,
    run,
    setNotice,
    t,
    acceptCreated: (next) => {
      versionTools.resetVersions();
      if (doc) commit(next);
      else open(next);
      setPageIndex(0);
      setSelected(undefined);
      setReplacementFont(undefined);
      setTool("select");
    },
  });
  const nativeImages = useNativeImages({
    doc,
    pageIndex,
    commit,
    run,
    t,
    setNotice,
  });
  const tableEditor = useTableEditor(doc, pageIndex, commit, run, t);
  const graphEditor = useGraphEditor(doc, pageIndex, commit, run);
  const imageEditing = useImageEditing(
    doc,
    pageIndex,
    mark,
    commit,
    run,
    selectMark,
  );
  return {
    imageEditing,
    graphEditor,
    tableEditor,
    nativeImages: { ...nativeImages, selectImage: selectNativeImage },
    shape,
    setShape,
    chooseShape,
    drawFreehand,
    ...versionTools,
    runTask: run,
    queryTask: (action: () => Promise<void>) => run(action, true),
    commitDocument: commit,
    ...advanced,
    ...opening,
    ...documentTools,
    operationError,
    noticeTone,
    fontInput,
    loadFont,
    replacementFontName:
      nativeBlock && replacementFont?.forFont === (nativeBlock.fontName ?? "")
        ? replacementFont?.name
        : undefined,
    language,
    setLanguage,
    theme,
    setTheme,
    t,
    nativeBlock,
    setNativeBlock,
    showShortcuts,
    showAbout,
    setShowAbout,
    setShowShortcuts,
    canvasScroll,
    replacement,
    setReplacement,
    ocrProgress,
    doc,
    undo,
    redo,
    canUndo,
    canRedo,
    pageIndex,
    setPageIndex,
    scale,
    setScale,
    tool,
    setTool,
    selected,
    setSelected,
    text,
    setText,
    size,
    setSize,
    color,
    setColor,
    font,
    setFont,
    busy,
    notice,
    setNotice,
    input,
    mergeInput,
    imageInput,
    page,
    mark,
    updateMark,
    place,
    pageAction,
    save,
    applyNative,
    ocr,
    deleteSelected,
    zoom,
    fit,
    chooseTool,
    selectPage,
    selectMark,
    selectNativeBlock,
    moveMark,
    resizeMark,
    updateOcrText,
    loadImage,
  };
}
export type EditorController = ReturnType<typeof useEditorController>;
