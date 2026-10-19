export type WorkbenchFeature =
  | "comments"
  | "stamp"
  | "measure"
  | "compare"
  | "search"
  | "workflow"
  | "media"
  | "prepress"
  | "accessibility"
  | "standards"
  | "javascript";
export const workbenchLabels: Record<WorkbenchFeature, string> = {
  comments: "Ajouter des commentaires",
  stamp: "Tampons personnalisés",
  measure: "Mesurer des objets",
  compare: "Comparer des fichiers",
  search: "Index de recherche",
  workflow: "Actions guidées et outils personnalisés",
  media: "Contenu multimédia",
  prepress: "Prépresse",
  accessibility: "Préparer l’accessibilité",
  standards: "Normes PDF",
  javascript: "JavaScript du document",
};
export interface Point {
  x: number;
  y: number;
}
export type MeasurementKind = "distance" | "perimeter" | "area";
export function measurePoints(
  points: Point[],
  kind: MeasurementKind,
  unitsPerPoint: number,
): number {
  if (
    !Number.isFinite(unitsPerPoint) ||
    unitsPerPoint <= 0 ||
    points.some((p) => !Number.isFinite(p.x + p.y))
  )
    throw new Error("INVALID_MEASUREMENT");
  if (points.length < (kind === "area" ? 3 : 2))
    throw new Error("INVALID_MEASUREMENT");
  if (kind === "area")
    return (
      Math.abs(
        points.reduce((sum, p, i) => {
          const next = points[(i + 1) % points.length];
          return sum + p.x * next.y - next.x * p.y;
        }, 0) / 2,
      ) *
      unitsPerPoint ** 2
    );
  const chain = kind === "perimeter" ? [...points, points[0]] : points;
  return (
    chain
      .slice(1)
      .reduce(
        (sum, p, i) => sum + Math.hypot(p.x - chain[i].x, p.y - chain[i].y),
        0,
      ) * unitsPerPoint
  );
}
export interface ReviewComment {
  id: string;
  page: number;
  author: string;
  text: string;
  date: string;
  x: number;
  y: number;
  replyTo?: string;
}
export type WorkflowStep =
  | { kind: "rotate"; angle: 90 | 180 | 270 }
  | { kind: "watermark"; text: string }
  | { kind: "ocr" }
  | { kind: "compress" };
export interface WorkflowRecipe {
  id: string;
  name: string;
  steps: WorkflowStep[];
}
