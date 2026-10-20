import { useEditor } from "../EditorContext";
import { WelcomeScreen } from "./WelcomeScreen";
import { ViewControls } from "./ViewControls";
import { EditorNotice } from "./EditorNotice";
import { PdfCanvas } from "./PdfCanvas";
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
    nativeImages,
    shape,
    color,
    drawFreehand,
    tableEditor,
    graphEditor,
    imageEditing,
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
              {imageEditing.selecting
                ? t(
                    "Encadrez l’illustration à rendre modifiable. Son contenu sera aplati en PNG. Échap pour annuler.",
                  )
                : graphEditor.selecting
                  ? t(
                      "Encadrez le graphique entier, titre et légende compris. Échap pour annuler.",
                    )
                  : tableEditor.selecting
                    ? t(
                        "Encadrez un seul tableau, bordures comprises. Échap pour annuler.",
                      )
                    : tool === "rectangle" && shape === "freehand"
                      ? t("Tracez sur la page. Échap annule le trait en cours.")
                      : tool === "select"
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
              onAreaSelect={
                !busy
                  ? imageEditing.selecting
                    ? imageEditing.selectArea
                    : graphEditor.selecting
                      ? graphEditor.select
                      : tableEditor.selecting
                        ? tableEditor.select
                        : undefined
                  : undefined
              }
              areaLabel={
                imageEditing.selecting
                  ? t(
                      "Encadrez l’illustration à rendre modifiable. Son contenu sera aplati en PNG. Échap pour annuler.",
                    )
                  : graphEditor.selecting
                    ? t(
                        "Encadrez le graphique entier, titre et légende compris. Échap pour annuler.",
                      )
                    : undefined
              }
              onFreehand={
                tool === "rectangle" &&
                shape === "freehand" &&
                !busy &&
                !tableEditor.selecting &&
                !graphEditor.selecting &&
                !imageEditing.selecting
                  ? drawFreehand
                  : undefined
              }
              drawingColor={color}
              nativeImages={nativeImages.images}
              selectedImage={nativeImages.selectedImage}
              onImageSelect={
                tool === "select" && !busy
                  ? nativeImages.selectImage
                  : undefined
              }
              t={t}
              onNativeSelect={
                (tool === "native" || tool === "select") && !busy
                  ? selectNativeBlock
                  : undefined
              }
              onPlace={!busy ? place : undefined}
              onSelect={tool === "select" && !busy ? selectMark : undefined}
              onMove={tool === "select" && !busy ? moveMark : undefined}
              onResize={tool === "select" && !busy ? resizeMark : undefined}
            />
          </div>
        </>
      ) : (
        <WelcomeScreen />
      )}
      {notice && <EditorNotice />}
      {tableEditor.error && !tableEditor.draft && (
        <p className="table-error" role="alert">
          {t(tableEditor.error)}
        </p>
      )}
      {graphEditor.error && !graphEditor.draft && (
        <p className="table-error" role="alert">
          {t(graphEditor.error)}
        </p>
      )}
      {imageEditing.error && (
        <p role="alert" className="table-error">
          {t(imageEditing.error)}
        </p>
      )}
      <ViewControls />
    </main>
  );
}
