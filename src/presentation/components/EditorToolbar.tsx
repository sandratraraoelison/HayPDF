import { Button } from "../ui/Button";
import { useEditor } from "../EditorContext";
import { ScanText, Redo2, ShieldCheck, Undo2 } from "lucide-react";
import { tools } from "../tools";
export function EditorToolbar() {
  const {
    chooseTool,
    t,
    ocrProgress,
    doc,
    undo,
    redo,
    canUndo,
    canRedo,
    tool,
    busy,
    ocr,
  } = useEditor();
  return (
    <nav className="toolbar">
      <div className="history">
        <Button title={t("Annuler")} disabled={!canUndo || busy} onClick={undo}>
          <Undo2 size={18} />
        </Button>
        <Button
          title={t("Rétablir")}
          disabled={!canRedo || busy}
          onClick={redo}
        >
          <Redo2 size={18} />
        </Button>
      </div>
      <div className="tools" inert={busy}>
        {tools.map((option) => (
          <Button
            key={option.id}
            className={tool === option.id ? "active" : ""}
            aria-pressed={tool === option.id}
            disabled={!doc || busy}
            onClick={() => chooseTool(option.id)}
          >
            <option.icon size={19} />
            {t(option.label)}
          </Button>
        ))}
      </div>
      <Button
        className="button ocr-button"
        disabled={!doc || busy}
        onClick={() => void ocr()}
      >
        <ScanText size={18} />
        {ocrProgress !== undefined
          ? `${Math.round(ocrProgress * 100)} %`
          : "OCR"}
      </Button>
      <span className="private">
        <ShieldCheck size={15} />
        {t("Vos fichiers restent sur votre appareil")}
      </span>
    </nav>
  );
}
