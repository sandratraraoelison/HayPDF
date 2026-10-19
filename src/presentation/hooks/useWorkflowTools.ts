import { useRef, useState } from "react";
import { useEditor } from "../EditorContext";
import { useWorkbench } from "../WorkbenchContext";
import {
  readRecipes,
  storeRecipes,
  validRecipe,
  applyWorkflow,
} from "../../application/workflows";
import type { WorkflowStep, WorkflowRecipe } from "../../domain/workbench";
import { readDocument, exportDocument } from "../../infrastructure/pdfEngine";
import {
  archiveFiles,
  type ExportFile,
} from "../../infrastructure/documentExports";
export function useWorkflowTools() {
  const { doc, commitDocument, t, setNotice } = useEditor(),
    { execute, download } = useWorkbench();
  const [recipes, setRecipes] = useState(readRecipes),
    [name, setName] = useState(""),
    [steps, setSteps] = useState<WorkflowStep[]>([{ kind: "compress" }]),
    [files, setFiles] = useState<File[]>([]),
    [progress, setProgress] = useState(""),
    [report, setReport] = useState<string[]>([]);
  const abort = useRef<AbortController | undefined>(undefined);
  async function saveRecipe() {
    await execute(async () => {
      const recipe = { id: crypto.randomUUID(), name, steps };
      if (!validRecipe(recipe)) throw new Error("INVALID_RECIPE");
      const next = [...recipes, recipe];
      storeRecipes(next);
      setRecipes(next);
    });
  }
  async function removeRecipe(id: string) {
    await execute(async () => {
      const next = recipes.filter((recipe) => recipe.id !== id);
      storeRecipes(next);
      setRecipes(next);
    });
  }
  async function importRecipe(file?: File) {
    if (file)
      await execute(async () => {
        const values: unknown = JSON.parse(await file.text());
        const input = Array.isArray(values) ? values : [values];
        if (!input.every(validRecipe)) throw new Error("INVALID_RECIPE");
        const next = [
          ...recipes,
          ...input.map((recipe) => ({ ...recipe, id: crypto.randomUUID() })),
        ];
        storeRecipes(next);
        setRecipes(next);
      });
  }
  const exportRecipes = () =>
    execute(() =>
      download(
        "haypdf-tools.json",
        new TextEncoder().encode(JSON.stringify(recipes, null, 2)),
        "application/json",
      ),
    );
  async function run() {
    await execute(async () => {
      if (!steps.length) throw new Error("INVALID_RECIPE");
      abort.current = new AbortController();
      const output: ExportFile[] = [],
        messages: string[] = [];
      setReport([]);
      try {
        if (!files.length && doc) {
          const next = await applyWorkflow(
            doc,
            steps,
            (step, page) =>
              setProgress(
                `${step + 1}/${steps.length}${page === undefined ? "" : ` · ${t("Page")} ${page + 1}`}`,
              ),
            abort.current.signal,
          );
          commitDocument(next);
          setNotice(t("Modification appliquée."), "success");
        } else {
          for (const [index, file] of files.entries()) {
            if (abort.current.signal.aborted) break;
            try {
              const source = await readDocument(
                  new Uint8Array(await file.arrayBuffer()),
                  file.name,
                ),
                next = await applyWorkflow(
                  source,
                  steps,
                  (step, page) =>
                    setProgress(
                      `${index + 1}/${files.length} · ${step + 1}/${steps.length}${page === undefined ? "" : ` · ${page + 1}`}`,
                    ),
                  abort.current.signal,
                );
              output.push({
                name: `${index + 1}-${file.name}`,
                mime: "application/pdf",
                bytes: await exportDocument(next),
              });
              messages.push(`${file.name}: OK`);
            } catch (error) {
              messages.push(
                `${file.name}: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }
          setReport(messages);
          output.push({
            name: "report.json",
            mime: "application/json",
            bytes: new TextEncoder().encode(
              JSON.stringify(
                { cancelled: abort.current.signal.aborted, files: messages },
                null,
                2,
              ),
            ),
          });
          const zip = archiveFiles("processed-pdfs.zip", output);
          await download(zip.name, zip.bytes, zip.mime);
        }
      } catch (error) {
        if (abort.current.signal.aborted)
          setNotice(t("Traitement interrompu."));
        else throw error;
      } finally {
        setProgress("");
        abort.current = undefined;
      }
    });
  }
  return {
    recipes,
    name,
    setName,
    steps,
    setSteps,
    files,
    setFiles,
    progress,
    report,
    saveRecipe,
    removeRecipe,
    importRecipe,
    exportRecipes,
    run,
    cancel: () => abort.current?.abort(),
    loadRecipe: (recipe: WorkflowRecipe) => {
      setName(recipe.name);
      setSteps(recipe.steps);
    },
  };
}
