import { useState } from "react";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase().trim();

export function useToolSearch(t: (value: string) => string) {
  const [query, setQuery] = useState("");
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return {
    query,
    setQuery,
    matches: (label: string) => {
      const text = normalize(t(label));
      return words.every((word) => text.includes(word));
    },
  };
}
