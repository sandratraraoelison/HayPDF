import type { Mark } from "../../domain/document";
import { useEditor } from "../EditorContext";
import { useOcrTextDraft } from "../hooks/useOcrTextDraft";
import { Button } from "../ui/Button";

export function OcrLineEditor({
  mark,
  number,
}: {
  mark: Mark;
  number: number;
}) {
  const { t, busy, updateOcrText } = useEditor();
  const editor = useOcrTextDraft(
    mark.text,
    (text) => void updateOcrText(mark.id, text),
  );
  return (
    <div className="ocr-line-editor">
      <label>
        {number}
        <textarea
          value={editor.draft}
          rows={2}
          onChange={(e) => editor.setDraft(e.target.value)}
        />
      </label>
      <Button
        variant="primary"
        disabled={busy || !editor.changed || !mark.rasterLine}
        onClick={editor.validate}
      >
        {t("Valider le texte")}
      </Button>
      <p>
        {t(
          "Validez pour modifier le texte visible dans l’image avec les caractères reconnus. Fond uniforme requis ; les caractères absents sont refusés.",
        )}
      </p>
    </div>
  );
}
