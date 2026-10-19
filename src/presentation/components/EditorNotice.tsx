import { Button } from "../ui/Button";
import { useEditor } from "../EditorContext";
import { OperationErrorDetails } from "./OperationErrorDetails";
import { CircleCheck, CircleAlert, Info, X } from "lucide-react";
export function EditorNotice() {
  const {
    notice,
    noticeTone,
    setNotice,
    operationError,
    fontInput,
    nativeBlock,
    t,
  } = useEditor();
  const tone = operationError ? "error" : noticeTone;
  const Icon =
    tone === "error" ? CircleAlert : tone === "success" ? CircleCheck : Info;
  return (
    <div
      className={`notice notice--${tone}`}
      role={operationError ? "alert" : "status"}
    >
      <div className="notice-heading">
        <Icon size={18} aria-hidden="true" />
        <span>{notice}</span>
        <Button aria-label={t("Fermer")} onClick={() => setNotice("")}>
          <X size={16} />
        </Button>
      </div>
      {operationError && (
        <OperationErrorDetails
          details={operationError.details}
          fontRelated={operationError.fontRelated}
          canLoadFont={!!nativeBlock}
          onLoadFont={() => fontInput.current?.click()}
          t={t}
        />
      )}
    </div>
  );
}
