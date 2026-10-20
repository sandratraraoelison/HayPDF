import { Button } from "../ui/Button";
import { useEditor } from "../EditorContext";
import {
  Download,
  FileText,
  FolderOpen,
  Moon,
  Sun,
  History,
  Info,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { DocumentMenu } from "./DocumentMenu";
export function EditorHeader() {
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    t,
    doc,
    busy,
    input,
    save,
    openVersions,
    setShowAbout,
  } = useEditor();
  return (
    <header>
      <DocumentMenu />
      <div className="brand">
        <BrandLogo />
        hay<span>pdf</span>
      </div>
      <Button
        variant="secondary"
        className="about-button button"
        onClick={() => setShowAbout(true)}
        title={t("À propos de HayPDF")}
        aria-label={t("À propos de HayPDF")}
        aria-haspopup="dialog"
      >
        <Info size={16} aria-hidden="true" />
        {t("À propos")}
      </Button>
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
