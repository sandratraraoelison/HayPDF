import { useId } from "react";
import { createPortal } from "react-dom";
import { Menu, FilePlus2, FolderOpen, Download, Keyboard } from "lucide-react";
import { Button } from "../ui/Button";
import { useEditor } from "../EditorContext";
import { useDropdown } from "../hooks/useDropdown";

export function DocumentMenu() {
  const { t, doc, busy, input, save, openDocumentTool, setShowShortcuts } =
    useEditor();
  const menu = useDropdown(busy, 260);
  const id = useId();
  const actions = [
    {
      label: "Nouveau document",
      icon: FilePlus2,
      action: () => void openDocumentTool("create"),
      disabled: false,
    },
    {
      label: "Ouvrir un PDF",
      icon: FolderOpen,
      action: () => input.current?.click(),
      disabled: false,
    },
    {
      label: "Exporter le PDF",
      icon: Download,
      action: () => void save(),
      disabled: !doc,
    },
    {
      label: "Raccourcis clavier",
      icon: Keyboard,
      action: () => setShowShortcuts(true),
      disabled: false,
    },
  ];
  return (
    <>
      <Button
        ref={menu.trigger}
        className="button document-menu-trigger"
        disabled={busy}
        aria-label={t("Fichier")}
        title={t("Fichier")}
        aria-haspopup="dialog"
        aria-expanded={menu.open}
        aria-controls={menu.open ? id : undefined}
        onClick={menu.toggle}
      >
        <Menu size={20} />
      </Button>
      {menu.open &&
        createPortal(
          <div
            ref={menu.panel}
            id={id}
            role="dialog"
            aria-label={t("Fichier")}
            className="document-menu"
            style={menu.position}
          >
            <div className="section-label">{t("Fichier")}</div>
            {actions.map((item) => (
              <Button
                key={item.label}
                disabled={item.disabled}
                onClick={() => {
                  menu.close();
                  item.action();
                }}
              >
                <item.icon size={18} aria-hidden="true" />
                {t(item.label)}
              </Button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
