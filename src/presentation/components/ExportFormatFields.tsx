import { exportFormats } from "../../application/exportFormats";
import type { DocumentToolOptions } from "../../application/documentTools";
import { NumberField } from "../ui/NumberField";

export function ExportFormatFields({
  options,
  onChange,
  t,
}: {
  options: DocumentToolOptions;
  onChange: (options: DocumentToolOptions) => void;
  t: (value: string) => string;
}) {
  const format = exportFormats.find((format) => format.id === options.format)!;
  const image = options.format === "png" || options.format === "jpeg";
  return (
    <>
      <label>
        {t("Format")}
        <select
          value={options.format}
          onChange={(event) =>
            onChange({
              ...options,
              format: event.target.value as DocumentToolOptions["format"],
            })
          }
        >
          {exportFormats.map((format) => (
            <option key={format.id} value={format.id}>
              {t(format.label)}
            </option>
          ))}
        </select>
      </label>
      <p className="conversion-description">{t(format.description)}</p>
      {format.recognition && (
        <>
          <label>
            {t("Langue du texte scanné (OCR)")}
            <select
              value={options.recognition ?? "none"}
              onChange={(event) =>
                onChange({
                  ...options,
                  recognition: event.target
                    .value as DocumentToolOptions["recognition"],
                })
              }
            >
              <option value="none">
                {t("Sans OCR : texte existant uniquement")}
              </option>
              <option value="fra">{t("Français")}</option>
              <option value="eng">{t("Anglais")}</option>
              <option value="fra+eng">{t("Français et anglais")}</option>
            </select>
          </label>
          <p>
            {t(
              "L’OCR s’applique aux pages sans texte recherchable. Il peut être plus lent et nécessite une relecture.",
            )}
          </p>
        </>
      )}
      {image && (
        <>
          <NumberField
            label={t("Résolution (DPI)")}
            value={options.dpi}
            min={72}
            max={300}
            onChange={(dpi) => onChange({ ...options, dpi })}
          />
          <p>
            {t(
              "Plusieurs pages : archive ZIP. Le côté le plus long est limité à 5 000 pixels.",
            )}
          </p>
        </>
      )}
    </>
  );
}
