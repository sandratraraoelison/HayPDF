import { useEffect, useState } from "react";
import { useMediaTools } from "../hooks/useMediaTools";
import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";
export function MediaPanel() {
  const { t } = useEditor(),
    tools = useMediaTools(),
    [url, setUrl] = useState("");
  useEffect(() => {
    if (!tools.selected) {
      setUrl("");
      return;
    }
    const object = URL.createObjectURL(
      new Blob([new Uint8Array(tools.selected.bytes)], {
        type: tools.selected.type,
      }),
    );
    setUrl(object);
    return () => URL.revokeObjectURL(object);
  }, [tools.selected]);
  return (
    <div>
      <p>
        {t(
          "Les fichiers sont intégrés au PDF comme pièces jointes. La lecture audio/vidéo est disponible ici ; elle dépend du lecteur lors de l’ouverture du PDF ailleurs.",
        )}
      </p>
      <label>
        {t("Ajouter une pièce jointe")}
        <input
          type="file"
          onChange={(e) => {
            void tools.add(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <ul className="review-list">
        {tools.files.map((file) => (
          <li key={file.name}>
            <strong>{file.name}</strong> · {file.bytes.length.toLocaleString()}{" "}
            {t("octets")}
            <div className="workbench-actions">
              <Button onClick={() => tools.setSelected(file)}>
                {t("Afficher")}
              </Button>
              <Button onClick={() => void tools.save(file)}>
                {t("Extraire")}
              </Button>
              <Button onClick={() => void tools.remove(file.name)}>
                {t("Supprimer")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {url && tools.selected?.type.startsWith("video/") && (
        <video controls src={url} />
      )}
      {url && tools.selected?.type.startsWith("audio/") && (
        <audio controls src={url} />
      )}
    </div>
  );
}
