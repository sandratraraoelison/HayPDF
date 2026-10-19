import { useEditor } from "../EditorContext";
import { WelcomeScreen } from "./WelcomeScreen";
import { ViewControls } from "./ViewControls";
import { EditorNotice } from "./EditorNotice";
import { PdfCanvas } from "../PdfCanvas";
export function DocumentWorkspace() {
  const {
    t,
    canvasScroll,
    doc,
    pageIndex,
    scale,
    tool,
    selected,
    busy,
    notice,
    page,
    place,
    selectMark,
    selectNativeBlock,
    moveMark,
    resizeMark,
  } = useEditor();
  return (
    <main>
      {doc && page ? (
        <>
          <div className="canvas-heading">
            <span>
              DOCUMENT <b>/</b>
              {t("PAGE")}
              {pageIndex + 1}
            </span>
            <span>
              {tool === "select"
                ? t("Sélectionnez et déplacez vos éléments")
                : tool === "native"
                  ? t("Cliquez sur un bloc de texte du PDF.")
                  : t("Cliquez sur la page pour ajouter un élément")}
            </span>
          </div>
          <div className="canvas-scroll" ref={canvasScroll}>
            <PdfCanvas
              doc={doc}
              page={page}
              scale={scale}
              selected={selected}
              t={t}
              onNativeSelect={
                tool === "native" && !busy ? selectNativeBlock : undefined
              }
              onPlace={place}
              onSelect={selectMark}
              onMove={moveMark}
              onResize={resizeMark}
            />
          </div>
        </>
      ) : (
        <WelcomeScreen />
      )}
      {notice && <EditorNotice />}
      <ViewControls />
    </main>
  );
}
