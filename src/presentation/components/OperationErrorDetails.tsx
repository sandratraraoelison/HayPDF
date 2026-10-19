import { Button } from "../ui/Button";
interface Props {
  details: string;
  fontRelated: boolean;
  canLoadFont: boolean;
  onLoadFont: () => void;
  t: (text: string) => string;
}
export function OperationErrorDetails({
  details,
  fontRelated,
  canLoadFont,
  onLoadFont,
  t,
}: Props) {
  return (
    <div className="operation-error-details">
      <details open>
        <summary>{t("Détails complets de l’erreur")}</summary>
        <pre tabIndex={0}>{details}</pre>
      </details>
      {fontRelated && (
        <>
          <p>
            {t(
              "Chargez le fichier TTF/OTF complet de la police indiquée, puis relancez le remplacement. Une police installée sur le système doit aussi être chargée ici.",
            )}
          </p>
          {canLoadFont && (
            <Button variant="secondary" onClick={onLoadFont}>
              {t("Charger une police TTF/OTF")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
