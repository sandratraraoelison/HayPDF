import { useReviewTools } from "../hooks/useReviewTools";
import { useEditor } from "../EditorContext";
import { Button } from "../ui/Button";
import { PdfAreaPreview } from "./PdfAreaPreview";
export function ReviewPanel() {
  const tools = useReviewTools(),
    { t, doc, page, busy } = useEditor();
  return (
    <div className="review-panel">
      <p>
        {t(
          "Commentaires PDF avec auteur, date et réponses. Les retours JSON sont associés au contenu du document.",
        )}
      </p>
      <div className="workbench-actions">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void tools.share("pdf")}
        >
          {t("Exporter pour commentaires")}
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void tools.share("json")}
        >
          {t("Exporter les retours JSON")}
        </Button>
      </div>
      <label>
        {t("Importer les retours JSON")}
        <input
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            void tools.importFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <label>
        {t("Auteur")}
        <input
          value={tools.author}
          onChange={(e) => tools.setAuthor(e.target.value)}
        />
      </label>
      <label>
        {t(tools.replyTo ? "Réponse" : "Commentaire")}
        <textarea
          rows={3}
          value={tools.text}
          onChange={(e) => tools.setText(e.target.value)}
        />
      </label>
      {doc && page && (
        <PdfAreaPreview
          doc={doc}
          page={page}
          area={{ ...tools.position, width: 20, height: 20 }}
          onPosition={(x, y) => tools.setPosition({ x, y })}
          t={t}
        />
      )}
      <div className="workbench-actions">
        <Button
          variant="primary"
          disabled={busy || !tools.text.trim()}
          onClick={() => void tools.saveComment()}
        >
          {t(
            tools.editing
              ? "Enregistrer le commentaire"
              : "Ajouter le commentaire",
          )}
        </Button>
        <Button onClick={tools.cancelEdit}>{t("Nouvelle note")}</Button>
      </div>
      <ul className="review-list">
        {tools.comments.map((comment) => (
          <li key={comment.id}>
            <strong>{comment.author || t("Anonyme")}</strong> · {t("Page")}{" "}
            {comment.page + 1} ·{" "}
            <time>{new Date(comment.date).toLocaleString()}</time>
            {comment.replyTo && <small>{t("Réponse")}</small>}
            <p>{comment.text}</p>
            <div className="workbench-actions">
              <Button onClick={() => tools.edit(comment)}>
                {t("Modifier")}
              </Button>
              <Button onClick={() => tools.reply(comment)}>
                {t("Répondre")}
              </Button>
              <Button onClick={() => void tools.remove(comment.id)}>
                {t("Supprimer")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
