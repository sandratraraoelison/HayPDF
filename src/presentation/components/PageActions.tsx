import { Button } from "../ui/Button";
import { useEditor } from "../EditorContext";
import {
  ArrowDown,
  ArrowUp,
  RotateCw,
  Scissors,
  Trash2,
  Copy,
} from "lucide-react";
export function PageActions() {
  const { t, doc, pageIndex, busy, pageAction, save, duplicatePage } =
    useEditor();
  return (
    <section className="page-organization">
      <div className="section-label">{t("ORGANISER LA PAGE")}</div>
      <div className="page-actions">
        <Button disabled={!doc || busy} onClick={duplicatePage}>
          <Copy size={18} />
          {t("Dupliquer")}
        </Button>
        <Button disabled={!doc || busy} onClick={() => pageAction("rotate")}>
          <RotateCw size={18} />
          {t("Pivoter")}
        </Button>
        <Button disabled={!doc || busy} onClick={() => void save(true)}>
          <Scissors size={18} />
          {t("Extraire")}
        </Button>
        <Button
          disabled={!doc || pageIndex === 0 || busy}
          onClick={() => pageAction("up")}
        >
          <ArrowUp size={18} />
          {t("Monter")}
        </Button>
        <Button
          disabled={!doc || pageIndex === doc.pages.length - 1 || busy}
          onClick={() => pageAction("down")}
        >
          <ArrowDown size={18} />
          {t("Descendre")}
        </Button>
      </div>
      <Button
        variant="danger"
        disabled={!doc || doc.pages.length <= 1 || busy}
        onClick={() => pageAction("delete")}
      >
        <Trash2 size={15} />
        {t("Supprimer la page")}
      </Button>
    </section>
  );
}
