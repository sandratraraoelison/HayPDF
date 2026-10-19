import { useEffect, useState } from "react";
import { useEditor } from "../EditorContext";
import { useWorkbench } from "../WorkbenchContext";
import {
  readComments,
  writeComments,
  exportReview,
  importReview,
} from "../../infrastructure/pdfReview";
import type { ReviewComment } from "../../domain/workbench";

export function useReviewTools() {
  const { doc, pageIndex, selectPage } = useEditor(),
    { execute, query:runQuery, modify, download } = useWorkbench();
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [text, setText] = useState(""),
    [author, setAuthor] = useState(""),
    [replyTo, setReplyTo] = useState<string>(),
    [editing, setEditing] = useState<string>();
  const [position, setPosition] = useState({ x: 40, y: 40 });
  useEffect(() => {
    let active = true;
    if (doc)
      void runQuery(async () => {
        const result = await readComments(doc);
        if (active) setComments(result);
      });
    return () => {
      active = false;
    };
  }, [doc]);
  async function saveComment() {
    if (!doc || !text.trim()) return;
    const comment: ReviewComment = {
      id: editing ?? crypto.randomUUID(),
      page: pageIndex,
      author,
      text,
      date: new Date().toISOString(),
      ...position,
      replyTo,
    };
    await modify((source) =>
      writeComments(source, [
        ...comments.filter((c) => c.id !== comment.id),
        comment,
      ]),
    );
    setText("");
    setReplyTo(undefined);
    setEditing(undefined);
  }
  function edit(comment: ReviewComment) {
    setEditing(comment.id);
    setReplyTo(comment.replyTo);
    setText(comment.text);
    setAuthor(comment.author);
    setPosition({ x: comment.x, y: comment.y });
    selectPage(comment.page);
  }
  function reply(comment: ReviewComment) {
    setEditing(undefined);
    setReplyTo(comment.id);
    setText("");
    setPosition({ x: comment.x, y: comment.y });
    selectPage(comment.page);
  }
  async function remove(id: string) {
    const removeIds = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      comments.forEach((c) => {
        if (c.replyTo && removeIds.has(c.replyTo) && !removeIds.has(c.id)) {
          removeIds.add(c.id);
          changed = true;
        }
      });
    }
    await modify((source) =>
      writeComments(
        source,
        comments.filter((c) => !removeIds.has(c.id)),
      ),
    );
  }
  async function share(mode: "json" | "pdf") {
    if (!doc) return;
    await execute(async () => {
      if (mode === "json")
        await download(
          "comments-review.json",
          new TextEncoder().encode(
            JSON.stringify(await exportReview(doc), null, 2),
          ),
          "application/json",
        );
      else {
        const { exportDocument } =
          await import("../../infrastructure/pdfEngine");
        await download(
          "review.pdf",
          await exportDocument(doc),
          "application/pdf",
        );
      }
    });
  }
  async function importFile(file?: File) {
    if (file)
      await modify(async (source) =>
        importReview(source, JSON.parse(await file.text())),
      );
  }
  return {
    comments,
    text,
    setText,
    author,
    setAuthor,
    replyTo,
    editing,
    position,
    setPosition,
    saveComment,
    edit,
    reply,
    remove,
    share,
    importFile,
    cancelEdit: () => {
      setEditing(undefined);
      setReplyTo(undefined);
      setText("");
    },
  };
}
