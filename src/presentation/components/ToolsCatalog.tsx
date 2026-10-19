import {
  Download,
  FilePlus2,
  Files,
  Scissors,
  Copy,
  LockKeyhole,
  Archive,
  ClipboardList,
  FileInput,
  ScanText,
  Pencil,
  Layers,
  SquareDashed,
  TextCursorInput,
  MessageSquare,
  Stamp,
  Ruler,
  GitCompareArrows,
  Search,
  Workflow,
  FileVideo,
  Printer,
  Accessibility,
  BadgeCheck,
  FileCode,
  X,
  type LucideIcon,
} from "lucide-react";
import { useToolSearch } from "../hooks/useToolSearch";
import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";
import type { DocumentTool } from "../../application/documentTools";
import { useWorkbench } from "../WorkbenchContext";
import { workbenchLabels, type WorkbenchFeature } from "../../domain/workbench";

const workbenchIcons: Record<WorkbenchFeature, LucideIcon> = {
  comments: MessageSquare,
  stamp: Stamp,
  measure: Ruler,
  compare: GitCompareArrows,
  search: Search,
  workflow: Workflow,
  media: FileVideo,
  prepress: Printer,
  accessibility: Accessibility,
  standards: BadgeCheck,
  javascript: FileCode,
};

export function ToolsCatalog({ onOrganize }: { onOrganize: () => void }) {
  const { openFeature } = useWorkbench();
  const {
    t,
    doc,
    busy,
    openDocumentTool,
    duplicatePage,
    ocr,
    chooseTool,
    mergeInput,
    setAdvancedAction,
  } = useEditor();
  const options: {
    label: string;
    tool: DocumentTool;
    icon: typeof Download;
    needsDocument: boolean;
  }[] = [
    {
      label: "Créer un PDF",
      tool: "create",
      icon: FilePlus2,
      needsDocument: false,
    },
    {
      label: "Document bureautique vers PDF",
      tool: "office",
      icon: FileInput,
      needsDocument: false,
    },
    {
      label: "Exporter un PDF",
      tool: "export",
      icon: Download,
      needsDocument: true,
    },
    {
      label: "Diviser un PDF",
      tool: "split",
      icon: Scissors,
      needsDocument: true,
    },
    {
      label: "Compresser un PDF",
      tool: "compress",
      icon: Archive,
      needsDocument: true,
    },
    {
      label: "Protéger un PDF",
      tool: "protect",
      icon: LockKeyhole,
      needsDocument: true,
    },
    {
      label: "Remplir un formulaire",
      tool: "form-data",
      icon: ClipboardList,
      needsDocument: true,
    },
  ];
  const { query, setQuery, matches } = useToolSearch(t);
  const editing = [
    {
      label: "Modifier un PDF",
      icon: Pencil,
      action: () => chooseTool("native"),
    },
    {
      label: "Combiner des fichiers",
      icon: Layers,
      action: () => mergeInput.current?.click(),
    },
    { label: "Organiser les pages", icon: Files, action: onOrganize },
    {
      label: "Préparer un formulaire",
      icon: TextCursorInput,
      action: () => setAdvancedAction("form"),
    },
    {
      label: "Biffer un PDF",
      icon: SquareDashed,
      action: () => setAdvancedAction("redact"),
    },
    { label: "Dupliquer la page", icon: Copy, action: duplicatePage },
    { label: "Scan et OCR", icon: ScanText, action: () => void ocr() },
  ].filter((option) => matches(option.label));
  const documents = options.filter((option) => matches(option.label));
  const advanced = (Object.keys(workbenchLabels) as WorkbenchFeature[]).filter(
    (feature) => matches(workbenchLabels[feature]),
  );
  const count = documents.length + editing.length + advanced.length;
  return (
    <aside className="edit-tools tools-catalog">
      <div className="catalog-search">
        <label htmlFor="tool-search">{t("Rechercher un outil")}</label>
        <div className="catalog-search-field">
          <Search size={16} aria-hidden="true" />
          <input
            id="tool-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Nom de l’outil…")}
          />
          {query && (
            <Button
              aria-label={t("Effacer la recherche")}
              onClick={() => setQuery("")}
            >
              <X size={15} aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
      {!doc && (
        <p className="catalog-hint">
          {t("Ouvrez un PDF pour activer les outils d’édition.")}
        </p>
      )}
      {documents.length > 0 && (
        <section>
          <h3>{t("Fichiers et export")}</h3>
          {documents.map((option) => (
            <Button
              key={option.tool}
              disabled={busy || (option.needsDocument && !doc)}
              onClick={() => void openDocumentTool(option.tool)}
            >
              <option.icon size={18} aria-hidden="true" />
              {t(option.label)}
            </Button>
          ))}
        </section>
      )}
      {editing.length > 0 && (
        <section>
          <h3>{t("Modifier et organiser")}</h3>
          {editing.map((option) => (
            <Button
              key={option.label}
              disabled={busy || !doc}
              onClick={option.action}
            >
              <option.icon size={18} aria-hidden="true" />
              {t(option.label)}
            </Button>
          ))}
        </section>
      )}
      {advanced.length > 0 && (
        <section>
          <h3>{t("Outils avancés")}</h3>
          {advanced.map((feature) => {
            const Icon = workbenchIcons[feature];
            return (
              <Button
                key={feature}
                disabled={
                  busy || (!doc && !["search", "workflow"].includes(feature))
                }
                onClick={() => openFeature(feature)}
              >
                <Icon size={18} aria-hidden="true" />
                {t(workbenchLabels[feature])}
              </Button>
            );
          })}
        </section>
      )}
      <p className="catalog-results" role="status">
        {count === 0 && t("Aucun outil trouvé. Essayez un autre mot.")}
      </p>
    </aside>
  );
}
