import type { DocumentModel } from "../domain/document";
import type { WorkflowStep, WorkflowRecipe } from "../domain/workbench";
import { exportDocument, readDocument } from "../infrastructure/pdfEngine";
import { applyAdvancedPdf } from "../infrastructure/advancedPdf";
import { compressPdf } from "../infrastructure/pdfSecurity";

export function validRecipe(value: unknown): value is WorkflowRecipe {
  const recipe = value as WorkflowRecipe;
  return (
    typeof recipe?.id === "string" &&
    typeof recipe.name === "string" &&
    !!recipe.name.trim() &&
    Array.isArray(recipe.steps) &&
    !!recipe.steps.length &&
    recipe.steps.every(
      (step) =>
        step &&
        (["ocr", "compress"].includes(step.kind) ||
          (step.kind === "rotate" && [90, 180, 270].includes(step.angle)) ||
          (step.kind === "watermark" &&
            typeof step.text === "string" &&
            !!step.text.trim())),
    )
  );
}
export function readRecipes(): WorkflowRecipe[] {
  try {
    const data: unknown = JSON.parse(
      localStorage.getItem("haypdf-workflows") ?? "[]",
    );
    return Array.isArray(data) ? data.filter(validRecipe) : [];
  } catch {
    return [];
  }
}
export function storeRecipes(recipes: WorkflowRecipe[]) {
  if (!recipes.every(validRecipe)) throw new Error("INVALID_RECIPE");
  localStorage.setItem("haypdf-workflows", JSON.stringify(recipes));
}
export async function applyWorkflow(
  source: DocumentModel,
  steps: WorkflowStep[],
  onProgress: (step: number, page?: number) => void,
  signal?: AbortSignal,
): Promise<DocumentModel> {
  let doc = source;
  for (const [i, step] of steps.entries()) {
    signal?.throwIfAborted();
    onProgress(i);
    if (step.kind === "rotate") {
      doc = await readDocument(await exportDocument(doc), doc.name);
      doc = {
        ...doc,
        pages: doc.pages.map((page) => ({
          ...page,
          rotation: (page.rotation + step.angle) % 360,
        })),
      };
    } else if (step.kind === "compress")
      doc = await readDocument(
        compressPdf(await exportDocument(doc)),
        doc.name,
      );
    else if (step.kind === "watermark")
      doc = await applyAdvancedPdf(doc, 0, "watermark", {
        text: step.text,
        footer: "",
        allPages: true,
        x: 0,
        y: 0,
        width: 200,
        height: 40,
      });
    else {
      const { recognizePage } = await import("../infrastructure/ocrEngine");
      for (let page = 0; page < doc.pages.length; page++) {
        signal?.throwIfAborted();
        onProgress(i, page);
        const marks = await recognizePage(doc, doc.pages[page], () => {});
        doc = {
          ...doc,
          pages: doc.pages.map((model, index) =>
            index === page
              ? {
                  ...model,
                  marks: [
                    ...model.marks.filter((mark) => !mark.invisible),
                    ...marks,
                  ],
                }
              : model,
          ),
        };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  signal?.throwIfAborted();
  return doc;
}
