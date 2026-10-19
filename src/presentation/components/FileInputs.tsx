import { useEditor } from "../EditorContext";
/** File inputs are kept mounted so toolbar and keyboard commands share the same pickers. */
export function FileInputs() {
  const {
    input,
    mergeInput,
    imageInput,
    fontInput,
    loadFont,
    load,
    loadImage,
    imageEditing,
  } = useEditor();
  return (
    <>
      <input
        ref={imageEditing.replacementInput}
        className="image-replacement-input"
        type="file"
        accept=".png,.jpg,.jpeg"
        hidden
        onChange={(event) => {
          void imageEditing.loadReplacement(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={fontInput}
        type="file"
        accept=".ttf,.otf"
        hidden
        onChange={(event) => {
          void loadFont(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={input}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(event) => {
          void load(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={mergeInput}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(event) => {
          void load(event.target.files?.[0], true);
          event.target.value = "";
        }}
      />
      <input
        ref={imageInput}
        type="file"
        accept="image/png,image/jpeg"
        hidden
        onChange={(event) => {
          void loadImage(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </>
  );
}
