import { useState } from "react";
import {
  FilePlus2,
  PanelTop,
  Droplets,
  Link,
  Layers,
  SquareDashed,
  TextCursorInput,
} from "lucide-react";
import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";
import { PagesSidebar } from "./PagesSidebar";
import { ToolsCatalog } from "./ToolsCatalog";

export function EditorSidebar() {
  const [tab, setTab] = useState<"tools" | "pages" | "all">("pages");
  const { t, doc, busy, setAdvancedAction } = useEditor();
  const groups = [
    {
      label: "Modifier la page",
      items: [
        {
          label: "Insérer une page vierge",
          icon: FilePlus2,
          action: () => setAdvancedAction("blank"),
        },
        {
          label: "Organiser les pages",
          icon: Layers,
          action: () => setTab("pages"),
        },
      ],
    },
    {
      label: "Ajouter un contenu",
      items: [
        {
          label: "En-tête et pied de page",
          icon: PanelTop,
          action: () => setAdvancedAction("header"),
        },
        {
          label: "Filigrane",
          icon: Droplets,
          action: () => setAdvancedAction("watermark"),
        },
        { label: "Lien", icon: Link, action: () => setAdvancedAction("link") },
      ],
    },
    {
      label: "Autres options",
      items: [
        {
          label: "Biffer un PDF",
          icon: SquareDashed,
          action: () => setAdvancedAction("redact"),
        },
        {
          label: "Préparer un formulaire",
          icon: TextCursorInput,
          action: () => setAdvancedAction("form"),
        },
      ],
    },
  ];
  return (
    <div className="editor-sidebar">
      <nav className="sidebar-tabs" aria-label={t("Panneau latéral")}>
        <Button aria-pressed={tab === "tools"} onClick={() => setTab("tools")}>
          {t("Modifier")}
        </Button>
        <Button aria-pressed={tab === "pages"} onClick={() => setTab("pages")}>
          {t("Pages")}
        </Button>
        <Button aria-pressed={tab === "all"} onClick={() => setTab("all")}>
          {t("Tous les outils")}
        </Button>
      </nav>
      {tab === "all" ? (
        <ToolsCatalog onOrganize={() => setTab("pages")} />
      ) : tab === "pages" ? (
        <PagesSidebar />
      ) : (
        <aside className="edit-tools">
          {groups.map((group) => (
            <section key={group.label}>
              <h3>{t(group.label)}</h3>
              {group.items.map((item) => (
                <Button
                  key={item.label}
                  disabled={!doc || busy}
                  onClick={item.action}
                >
                  <item.icon size={18} />
                  {t(item.label)}
                </Button>
              ))}
            </section>
          ))}
        </aside>
      )}
    </div>
  );
}
