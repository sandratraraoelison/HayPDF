import type { FormFieldModel, FormValue } from "../../domain/formField";

export function FormFieldInputs({
  fields,
  values,
  onChange,
  t,
}: {
  fields: FormFieldModel[];
  values: Record<string, FormValue>;
  onChange: (name: string, value: FormValue) => void;
  t: (text: string) => string;
}) {
  if (!fields.length)
    return <p>{t("Ce document ne contient aucun champ de formulaire.")}</p>;
  return (
    <div className="form-field-inputs">
      {fields.map((field) => {
        const value = values[field.name] ?? field.value;
        return (
          <label
            key={field.name}
            className={field.kind === "checkbox" ? "inline-check" : undefined}
          >
            {field.kind !== "checkbox" && field.name}
            {field.kind === "checkbox" ? (
              <>
                <input
                  type="checkbox"
                  disabled={field.readOnly}
                  checked={value === true}
                  onChange={(e) => onChange(field.name, e.target.checked)}
                />
                {field.name}
              </>
            ) : field.kind === "text" ? (
              <input
                disabled={field.readOnly}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(field.name, e.target.value)}
              />
            ) : (
              <select
                disabled={field.readOnly}
                multiple={field.kind === "list"}
                value={
                  field.kind === "list"
                    ? Array.isArray(value)
                      ? value
                      : []
                    : typeof value === "string"
                      ? value
                      : ""
                }
                onChange={(e) =>
                  onChange(
                    field.name,
                    field.kind === "list"
                      ? Array.from(
                          e.target.selectedOptions,
                          (option) => option.value,
                        )
                      : e.target.value,
                  )
                }
              >
                {field.kind !== "list" && (
                  <option value="">{t("Aucune sélection")}</option>
                )}
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </label>
        );
      })}
    </div>
  );
}
