import { useState } from "react";
import type { DocumentModel } from "../../domain/document";
import {
  applyAdvancedPdf,
  type AdvancedAction,
  type AdvancedOptions,
} from "../../infrastructure/advancedPdf";

export function useAdvancedTools({
  doc,
  pageIndex,
  commit,
  run,
  setNotice,
  t,
}: {
  doc?: DocumentModel;
  pageIndex: number;
  commit: (doc: DocumentModel) => void;
  run: (action: () => Promise<void>) => Promise<void>;
  setNotice: (text: string, tone?: "info" | "success") => void;
  t: (text: string) => string;
}) {
  const [advancedAction, setAction] = useState<AdvancedAction>();
  function setAdvancedAction(action: AdvancedAction | undefined) {
    setNotice("");
    setAction(action);
  }
  async function applyAdvanced(options: AdvancedOptions) {
    if (!doc || !advancedAction) return;
    await run(async () => {
      commit(
        await applyAdvancedPdf(
          doc,
          Math.min(pageIndex, doc.pages.length - 1),
          advancedAction,
          options,
        ),
      );
      setAdvancedAction(undefined);
      setNotice(t("Modification appliquée."), "success");
    });
  }
  return { advancedAction, setAdvancedAction, applyAdvanced };
}
