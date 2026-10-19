import { Button } from "../ui/Button";
import { useEditor } from "../EditorContext";
import { FileText, Layers, PenLine, Plus, Type } from "lucide-react";
export function WelcomeScreen() {
  const { t, input } = useEditor();
  return (
    <div className="welcome">
      <div className="eyebrow">
        <span />
        {t("VOTRE ESPACE DE TRAVAIL, EN TOUTE SIMPLICITÉ")}
      </div>
      <h1>
        {t("Vos PDF.")}
        <br />
        <em>{t("À votre façon.")}</em>
      </h1>
      <p>
        {t("Une idée à annoter, un document à assembler.")}
        <br />
        {t("Retrouvez l’essentiel pour donner forme à vos PDF.")}
      </p>
      <div className="dropzone">
        <div className="file-icon">
          <FileText size={35} />
          <span>PDF</span>
        </div>
        <h3>{t("Glissez votre PDF ici")}</h3>
        <p>{t("ou choisissez un fichier sur votre appareil")}</p>
        <Button variant="primary" onClick={() => input.current?.click()}>
          <Plus size={17} />
          {t("Ouvrir un document")}
        </Button>
        <small>{t("PDF jusqu’à 100 Mo · Traitement 100 % local")}</small>
      </div>
      <div className="features">
        <span>
          <Type size={18} />
          {t("Ajoutez du texte")}
        </span>
        <span>
          <PenLine size={18} />
          {t("Annotez librement")}
        </span>
        <span>
          <Layers size={18} />
          {t("Organisez vos pages")}
        </span>
      </div>
    </div>
  );
}
