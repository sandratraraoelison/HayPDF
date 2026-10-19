import { useEffect, useRef } from "react";
import { useWorkbench } from "../WorkbenchContext";
import { useEditor } from "../EditorContext";
import { workbenchLabels } from "../../domain/workbench";
import { Button } from "../ui/Button";
import { OperationErrorDetails } from "./OperationErrorDetails";
import { ReviewPanel } from "./ReviewPanel";
import { AnnotationToolsPanel } from "./AnnotationToolsPanel";
import { ComparisonPanel } from "./ComparisonPanel";
import { SearchIndexPanel } from "./SearchIndexPanel";
import { WorkflowPanel } from "./WorkflowPanel";
import { MediaPanel } from "./MediaPanel";
import { AuditToolsPanel } from "./AuditToolsPanel";
export function WorkbenchDialog() {
  const { feature, closeFeature, downloadCurrent } = useWorkbench(),
    { t, busy, doc, operationError } = useEditor(),
    ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  if (!feature) return null;
  const content =
    feature === "comments" ? (
      <ReviewPanel />
    ) : feature === "stamp" || feature === "measure" ? (
      <AnnotationToolsPanel mode={feature} />
    ) : feature === "compare" ? (
      <ComparisonPanel />
    ) : feature === "search" ? (
      <SearchIndexPanel />
    ) : feature === "workflow" ? (
      <WorkflowPanel />
    ) : feature === "media" ? (
      <MediaPanel />
    ) : (
      <AuditToolsPanel mode={feature} />
    );
  return (
    <dialog
      ref={ref}
      className="advanced-dialog workbench-dialog"
      aria-labelledby="workbench-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      onClose={closeFeature}
    >
      <div className="workbench-heading">
        <h2 id="workbench-title">{t(workbenchLabels[feature])}</h2>
        <Button disabled={busy} onClick={() => ref.current?.close()}>
          {t("Fermer")}
        </Button>
      </div>
      {feature === "workflow" ? (
        content
      ) : (
        <fieldset disabled={busy}>{content}</fieldset>
      )}
      {operationError && (
        <div role="alert" className="advanced-error">
          <p>{operationError.summary}</p>
          <OperationErrorDetails
            details={operationError.details}
            fontRelated={operationError.fontRelated}
            canLoadFont={false}
            onLoadFont={() => {}}
            t={t}
          />
        </div>
      )}
      {doc && (
        <div className="advanced-actions">
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => void downloadCurrent()}
          >
            {t("Exporter le PDF")}
          </Button>
        </div>
      )}
    </dialog>
  );
}
