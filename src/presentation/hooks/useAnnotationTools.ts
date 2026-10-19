import { useState } from "react";
import { useEditor } from "../EditorContext";
import { useWorkbench } from "../WorkbenchContext";
import {
  addCustomStamp,
  addMeasurement,
} from "../../infrastructure/pdfAnnotations";
import {
  measurePoints,
  type Point,
  type MeasurementKind,
} from "../../domain/workbench";
export function useAnnotationTools() {
  const { pageIndex } = useEditor(),
    { modify } = useWorkbench();
  const [points, setPoints] = useState<Point[]>([]),
    [kind, setKind] = useState<MeasurementKind>("distance"),
    [factor, setFactor] = useState(25.4 / 72),
    [unit, setUnit] = useState("mm"),
    [knownLength, setKnownLength] = useState(100);
  const [rect, setRect] = useState({ x: 40, y: 40, width: 200, height: 60 }),
    [text, setText] = useState("VALIDÉ · {date}"),
    [image, setImage] = useState<File>();
  let result: number | undefined;
  try {
    result = measurePoints(points, kind, factor);
  } catch {}
  function calibrate() {
    if (points.length >= 2) {
      const distance = Math.hypot(
        points[1].x - points[0].x,
        points[1].y - points[0].y,
      );
      if (distance > 0) setFactor(knownLength / distance);
    }
  }
  const saveMeasurement = () =>
    modify((doc) => addMeasurement(doc, pageIndex, points, kind, factor, unit));
  const saveStamp = () =>
    modify(async (doc) =>
      addCustomStamp(
        doc,
        pageIndex,
        rect,
        text,
        image ? new Uint8Array(await image.arrayBuffer()) : undefined,
      ),
    );
  return {
    points,
    setPoints,
    kind,
    setKind,
    factor,
    setFactor,
    unit,
    setUnit,
    knownLength,
    setKnownLength,
    result,
    calibrate,
    saveMeasurement,
    rect,
    setRect,
    text,
    setText,
    image,
    setImage,
    saveStamp,
  };
}
