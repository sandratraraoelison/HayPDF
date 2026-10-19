import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFOptionList,
  PDFName,
  PDFArray,
  PDFDict,
  PDFRef,
} from "pdf-lib";
import type { FormFieldModel, FormValue } from "../domain/formField";

export async function readFormFields(
  bytes: Uint8Array,
): Promise<FormFieldModel[]> {
  const pdf = await PDFDocument.load(bytes);
  return pdf
    .getForm()
    .getFields()
    .flatMap<FormFieldModel>((field) => {
      const common = { name: field.getName(), readOnly: field.isReadOnly() };
      if (field instanceof PDFTextField)
        return [
          { ...common, kind: "text" as const, value: field.getText() ?? "" },
        ];
      if (field instanceof PDFCheckBox)
        return [
          { ...common, kind: "checkbox" as const, value: field.isChecked() },
        ];
      if (field instanceof PDFDropdown)
        return [
          {
            ...common,
            kind: "dropdown" as const,
            value: field.getSelected()[0] ?? "",
            options: field.getOptions(),
          },
        ];
      if (field instanceof PDFRadioGroup)
        return [
          {
            ...common,
            kind: "radio" as const,
            value: field.getSelected() ?? "",
            options: field.getOptions(),
          },
        ];
      if (field instanceof PDFOptionList)
        return [
          {
            ...common,
            kind: "list" as const,
            value: field.getSelected(),
            options: field.getOptions(),
          },
        ];
      return [];
    });
}

export async function fillFormFields(
  bytes: Uint8Array,
  values: Record<string, FormValue>,
  flatten = false,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();
  for (const field of form.getFields()) {
    const value = values[field.getName()];
    if (value === undefined || field.isReadOnly()) continue;
    if (field instanceof PDFTextField && typeof value === "string")
      field.setText(value);
    else if (field instanceof PDFCheckBox && typeof value === "boolean")
      value ? field.check() : field.uncheck();
    else if (
      (field instanceof PDFDropdown || field instanceof PDFRadioGroup) &&
      typeof value === "string"
    ) {
      if (!value) field.clear();
      else if (field.getOptions().includes(value)) field.select(value);
      else throw new Error("INVALID_FORM_VALUE");
    } else if (field instanceof PDFOptionList && Array.isArray(value)) {
      if (value.some((v) => !field.getOptions().includes(v)))
        throw new Error("INVALID_FORM_VALUE");
      field.clear();
      if (value.length) field.select(value);
    } else throw new Error("INVALID_FORM_VALUE");
  }
  if (flatten) {
    const widgets = pdf.getPages().map((page) => ({
      page,
      refs: (
        page.node.lookupMaybe(PDFName.of("Annots"), PDFArray)?.asArray() ?? []
      ).filter(
        (ref): ref is PDFRef =>
          ref instanceof PDFRef &&
          pdf.context.lookup(ref, PDFDict).get(PDFName.of("Subtype")) ===
            PDFName.of("Widget"),
      ),
    }));
    form.flatten();
    // pdf-lib's removeField can leave widget references in Annots after deleting them.
    for (const { page, refs } of widgets)
      for (const ref of refs) page.node.removeAnnot(ref);
  }
  return pdf.save();
}
