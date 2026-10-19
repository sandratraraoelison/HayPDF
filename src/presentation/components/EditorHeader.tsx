import { Button } from "../ui/Button";
import { useEditor } from "../EditorContext";
import {
  Download,
  FileText,
  FolderOpen,
  Layers,
  Moon,
  Sun,
  Keyboard,
  History,
} from "lucide-react";
export function EditorHeader() {
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    t,
    setShowShortcuts,
    doc,
    busy,
    input,
    save,
    openVersions,
  } = useEditor();
  return (
    <header>
      <Button
        className="button shortcut-button"
        title={`${t("Raccourcis clavier")} (F1)`}
        aria-label={t("Raccourcis clavier")}
        onClick={() => setShowShortcuts(true)}
      >
        <Keyboard size={18} />
      </Button>
      <a className="brand" href="#">
        <span className="logo">
          <Layers size={23} />
        </span>
        hay<span>pdf</span>
        <small>{t("ATELIER PDF")}</small>
      </a>
      <div className="document-name">
        <FileText size={16} />
        {doc?.name || t("Votre prochain document commence ici")}
        {doc && <span className="tag">{t("Local")}</span>}
      </div>
      <select
        className="language-select"
        aria-label={t("Langue de l’interface")}
        value={language}
        onChange={(e) => setLanguage(e.target.value as "fr" | "en")}
      >
        <option value="fr">Français</option>
        <option value="en">English</option>
      </select>
      <Button
        className="theme-toggle button"
        title={t(
          theme === "dark" ? "Passer au mode clair" : "Passer au mode sombre",
        )}
        aria-label={t(
          theme === "dark" ? "Passer au mode clair" : "Passer au mode sombre",
        )}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </Button>
      <Button
        variant="secondary"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <FolderOpen size={16} />
        {t("Ouvrir un PDF")}
      </Button>
      <Button
        variant="primary"
        disabled={!doc || busy}
        onClick={() => void save()}
      >
        <Download size={16} />
        {busy ? t("Traitement…") : t("Exporter le PDF")}
      </Button>
      {doc && (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={openVersions}
          title={t("Atelier de versions")}
        >
          <History size={17} aria-hidden="true" />
          {t("Versions")}
        </Button>
      )}
    </header>
  );
}
