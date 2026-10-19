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
} from "lucide-react";
import { appInfo } from "../../application/appInfo";
import { useEditor } from "../EditorContext";
import { useAboutDialog } from "../hooks/useAboutDialog";
import { Button } from "../ui/Button";
import { BrandLogo } from "./BrandLogo";

const features = [
  {
    icon: FilePenLine,
    title: "Modifier et annoter",
    summary:
      "Remplacez le texte natif, ajoutez du texte, des images, des formes, des signatures et des tampons.",
  },
  {
    icon: Files,
    title: "Organiser et exporter",
    summary:
      "Fusionnez, dupliquez, pivotez et divisez vos pages. Exportez en PDF, PNG, JPEG ou texte.",
  },
  {
    icon: ScanText,
    title: "Reconnaissance de texte",
    summary:
      "OCR local français et anglais sur la page courante, avec correction des lignes reconnues.",
  },
  {
    icon: ClipboardList,
    title: "Formulaires et révision",
    summary:
      "Créez et remplissez des formulaires. Ajoutez des commentaires, des liens et des pièces jointes.",
  },
  {
    icon: History,
    title: "Versions et comparaison",
    summary:
      "Gardez des étapes nommées pendant la session, comparez les rendus et restaurez une version avec annulation possible.",
  },
  {
    icon: ShieldCheck,
    title: "Protection et confidentialité",
    summary:
      "Traitez vos fichiers sur votre appareil. Protégez une copie par mot de passe AES-256 et compressez sans perte.",
  },
  {
    icon: Wrench,
    title: "Outils avancés",
    summary:
      "Mesures, index de recherche local, traitements guidés, prépresse, contrôles d’accessibilité et export d’archivage PDF/A-2b.",
  },
] as const;

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
        {features.map(({ icon: Icon, title, summary }) => (
          <article key={title}>
            <Icon size={22} aria-hidden="true" />
            <div>
              <h4>{t(title)}</h4>
              <p>{t(summary)}</p>
            </div>
          </article>
        ))}
      </div>
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
