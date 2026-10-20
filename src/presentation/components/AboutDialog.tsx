import {
  FilePenLine,
  Files,
  ScanText,
  ShieldCheck,
  History,
  ClipboardList,
  Mail,
  X,
  Wrench,
  Info,
} from "lucide-react";
import { appFeatures } from "../../application/appFeatures";
import { exportFormats } from "../../application/exportFormats";
import { appInfo } from "../../application/appInfo";
import { useEditor } from "../EditorContext";
import { useAboutDialog } from "../hooks/useAboutDialog";
import { Button } from "../ui/Button";
import { BrandLogo } from "./BrandLogo";

const featureIcons = {
  FilePenLine,
  Files,
  ScanText,
  ShieldCheck,
  History,
  ClipboardList,
  Wrench,
  Info,
};

export function AboutDialog() {
  const { t, setShowAbout } = useEditor();
  const { dialog, close } = useAboutDialog();
  return (
    <dialog
      ref={dialog}
      className="advanced-dialog about-dialog"
      aria-labelledby="about-title"
      onClose={() => setShowAbout(false)}
    >
      <div className="about-heading">
        <BrandLogo size={64} />
        <div>
          <h2 id="about-title">{t("À propos de HayPDF")}</h2>
          <span className="about-version">
            {t("Version actuelle")} {appInfo.version}
          </span>
        </div>
        <Button aria-label={t("Fermer")} onClick={close} autoFocus>
          <X size={20} aria-hidden="true" />
        </Button>
      </div>
      <p className="about-intro">
        {t(
          "Votre atelier PDF local, en français et en anglais. Modifiez, organisez et préparez vos documents depuis une seule interface.",
        )}
      </p>
      <h3>{t("Fonctions disponibles")}</h3>
      <div className="about-features">
        {appFeatures.map(({ icon, title, summary }) => {
          const Icon = featureIcons[icon];
          return (
            <article key={title}>
              <Icon size={22} aria-hidden="true" />
              <div>
                <h4>{t(title)}</h4>
                <p>{t(summary)}</p>
              </div>
            </article>
          );
        })}
      </div>
      <p className="about-requirements">
        {t("Formats d’export disponibles")} :{" "}
        {exportFormats.map((format) => t(format.label)).join(" · ")}
      </p>
      <p className="about-requirements">
        {t(
          "La conversion bureautique nécessite LibreOffice installé. Les contrôles PDF/A utilisent veraPDF ; l’export d’archivage produit une copie avec pages en images. Les versions nommées restent en mémoire pendant la session.",
        )}
      </p>
      <footer className="about-footer">
        <div>
          <span>{t("Créé par")}</span>
          <strong>{appInfo.author}</strong>
        </div>
        <a
          className="about-contact"
          href={`mailto:${appInfo.email}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Mail size={18} aria-hidden="true" />
          <span>
            {t("Contact")}
            <strong>{appInfo.email}</strong>
          </span>
        </a>
        <small>
          © {appInfo.copyrightYear} {appInfo.author}.{" "}
          {t("Tous droits réservés.")}
        </small>
      </footer>
    </dialog>
  );
}
