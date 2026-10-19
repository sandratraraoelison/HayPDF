export type FormValue = string | boolean | string[];
export interface FormFieldModel {
  name: string;
  kind: "text" | "checkbox" | "dropdown" | "radio" | "list";
  value: FormValue;
  options?: string[];
  readOnly: boolean;
}
