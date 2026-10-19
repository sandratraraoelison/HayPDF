import { useId } from "react";
import { createPortal } from "react-dom";
import { Square, ChevronDown } from "lucide-react";
import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";
import { ShapePicker } from "./ShapePicker";
import { useDropdown } from "../hooks/useDropdown";

export function ShapeToolButton() {
  const { t, doc, busy, tool, shape, chooseShape } = useEditor();
  const menu = useDropdown(!doc || busy);
  const id = useId();
  return (
    <>
      <Button
        ref={menu.trigger}
        className={tool === "rectangle" ? "active" : ""}
        disabled={!doc || busy}
        aria-expanded={menu.open}
        aria-haspopup="dialog"
        aria-controls={menu.open ? id : undefined}
        onClick={menu.toggle}
      >
        <Square size={19} />
        <span>
          {t("Forme")} <ChevronDown size={10} />
        </span>
      </Button>
      {menu.open &&
        createPortal(
          <div
            id={id}
            ref={menu.panel}
            role="dialog"
            aria-label={t("Choisir une forme")}
            className="shape-dropdown"
            style={menu.position}
          >
            <ShapePicker
              value={shape}
              t={t}
              onChange={(value) => {
                chooseShape(value);
                menu.close();
                menu.trigger.current?.focus();
              }}
            />
            <Button
              className="shape-dropdown-close"
              onClick={() => {
                menu.close();
                menu.trigger.current?.focus();
              }}
            >
              {t("Fermer")}
            </Button>
          </div>,
          document.body,
        )}
    </>
  );
}
