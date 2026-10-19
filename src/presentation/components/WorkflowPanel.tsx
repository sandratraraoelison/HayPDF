import { useWorkflowTools } from "../hooks/useWorkflowTools";
import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";
import type { WorkflowStep } from "../../domain/workbench";
export function WorkflowPanel() {
  const tools = useWorkflowTools(),
    { t, busy, doc } = useEditor();
  return (
    <div>
      <fieldset disabled={busy}>
        <p>
          {t(
            "Créez une suite d’actions réutilisable. Sans fichiers sélectionnés, elle s’applique au document ouvert avec une seule entrée d’annulation.",
          )}
        </p>
        <label>
          {t("Nom de l’outil")}
          <input
            value={tools.name}
            onChange={(e) => tools.setName(e.target.value)}
          />
        </label>
        <ol className="workflow-steps">
          {tools.steps.map((step, i) => (
            <li key={i}>
              <select
                aria-label={t("Action")}
                value={step.kind}
                onChange={(e) => {
                  const kind = e.target.value;
                  const next: WorkflowStep =
                    kind === "rotate"
                      ? { kind, angle: 90 }
                      : kind === "watermark"
                        ? { kind, text: "DRAFT" }
                        : kind === "ocr"
                          ? { kind }
                          : { kind: "compress" };
                  tools.setSteps(
                    tools.steps.map((old, n) => (n === i ? next : old)),
                  );
                }}
              >
                <option value="compress">{t("Compresser un PDF")}</option>
                <option value="rotate">{t("Pivoter")}</option>
                <option value="watermark">{t("Filigrane")}</option>
                <option value="ocr">OCR</option>
              </select>
              {step.kind === "watermark" && (
                <input
                  value={step.text}
                  onChange={(e) =>
                    tools.setSteps(
                      tools.steps.map((old, n) =>
                        n === i ? { ...step, text: e.target.value } : old,
                      ),
                    )
                  }
                />
              )}{" "}
              {step.kind === "rotate" && (
                <select
                  value={step.angle}
                  onChange={(e) =>
                    tools.setSteps(
                      tools.steps.map((old, n) =>
                        n === i
                          ? {
                              kind: "rotate",
                              angle: Number(e.target.value) as 90 | 180 | 270,
                            }
                          : old,
                      ),
                    )
                  }
                >
                  <option value="90">90°</option>
                  <option value="180">180°</option>
                  <option value="270">270°</option>
                </select>
              )}
              <Button
                onClick={() =>
                  tools.setSteps(tools.steps.filter((_, n) => n !== i))
                }
              >
                {t("Supprimer")}
              </Button>
            </li>
          ))}
        </ol>
        <div className="workbench-actions">
          <Button
            onClick={() =>
              tools.setSteps([...tools.steps, { kind: "compress" }])
            }
          >
            {t("Ajouter une action")}
          </Button>
          <Button
            disabled={!tools.name.trim() || !tools.steps.length}
            onClick={() => void tools.saveRecipe()}
          >
            {t("Enregistrer l’outil")}
          </Button>
          <Button onClick={() => void tools.exportRecipes()}>
            {t("Exporter les outils")}
          </Button>
        </div>
        <label>
          {t("Importer des outils JSON")}
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              void tools.importRecipe(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <ul>
          {tools.recipes.map((recipe) => (
            <li key={recipe.id}>
              <Button onClick={() => tools.loadRecipe(recipe)}>
                {recipe.name}
              </Button>
              <Button onClick={() => void tools.removeRecipe(recipe.id)}>
                {t("Supprimer")}
              </Button>
            </li>
          ))}
        </ul>
        <label>
          {t("PDF à traiter (facultatif)")}
          <input
            type="file"
            multiple
            accept="application/pdf"
            onChange={(e) => tools.setFiles(Array.from(e.target.files ?? []))}
          />
        </label>
        <p>{tools.files.map((file) => file.name).join(", ")}</p>
        <Button
          variant="primary"
          disabled={
            busy || (!doc && !tools.files.length) || !tools.steps.length
          }
          onClick={() => void tools.run()}
        >
          {t("Exécuter les actions")}
        </Button>
      </fieldset>
      <p aria-live="polite">{tools.progress}</p>
      {tools.progress && (
        <Button onClick={tools.cancel}>
          {t("Arrêter après l’opération en cours")}
        </Button>
      )}
      <ul>
        {tools.report.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
