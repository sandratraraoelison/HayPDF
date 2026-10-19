import type { AdvancedOptions } from "../../infrastructure/advancedPdf";

export function FormFieldOptions({
  options,
  onChange,
  t,
}: {
  options: AdvancedOptions;
  onChange: (options: AdvancedOptions) => void;
  t: (text: string) => string;
}) {
  return (
    <div className="form-field-options">
      <label>
        {t("Type de champ")}
        <select
          value={options.formType ?? "text"}
          onChange={(e) =>
            onChange({
              ...options,
              formType: e.target.value as AdvancedOptions["formType"],
            })
          }
        >
          <option value="text">{t("Champ de texte")}</option>
          <option value="checkbox">{t("Case à cocher")}</option>
          <option value="dropdown">{t("Liste déroulante")}</option>
          <option value="radio">{t("Groupe de boutons radio")}</option>
          <option value="list">{t("Liste à choix multiples")}</option>
        </select>
      </label>
      <label>
        {t("Nom du champ")}
        <input
          value={options.fieldName ?? ""}
          placeholder={t("Généré automatiquement si vide")}
          onChange={(e) => onChange({ ...options, fieldName: e.target.value })}
        />
      </label>
      {["dropdown", "radio", "list"].includes(options.formType ?? "") && (
        <label>
          {t("Choix (un par ligne)")}
          <textarea
            required
            rows={4}
            value={options.choices ?? ""}
            onChange={(e) => onChange({ ...options, choices: e.target.value })}
          />
        </label>
      )}
      {options.formType === "checkbox" && (
        <label className="inline-check">
          <input
            type="checkbox"
            checked={options.checked ?? false}
            onChange={(e) =>
              onChange({ ...options, checked: e.target.checked })
            }
          />
          {t("Cochée par défaut")}
        </label>
      )}
      <label className="inline-check">
        <input
          type="checkbox"
          checked={options.required ?? false}
          onChange={(e) => onChange({ ...options, required: e.target.checked })}
        />
        {t("Champ obligatoire")}
      </label>
    </div>
  );
}
