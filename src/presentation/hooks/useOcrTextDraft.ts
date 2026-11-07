import { useEffect, useState } from "react";

export function useOcrTextDraft(
  text: string,
  onValidate: (text: string) => void,
) {
  const [draft, setDraft] = useState(text);
  useEffect(() => {
    setDraft(text);
  }, [text]);
  return {
    draft,
    setDraft,
    changed: draft !== text,
    validate: () => {
      if (draft !== text) onValidate(draft);
    },
  };
}
