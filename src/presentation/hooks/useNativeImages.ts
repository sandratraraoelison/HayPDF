import { useEffect, useState } from "react";
import type { DocumentModel } from "../../domain/document";
import type { NativeImage } from "../../domain/nativeImage";
import {
  extractNativeImages,
  removeNativeImage,
} from "../../infrastructure/nativeImages";

export function useNativeImages({
  doc,
  pageIndex,
  commit,
  run,
  t,
  setNotice,
}: {
  doc?: DocumentModel;
  pageIndex: number;
  commit: (doc: DocumentModel) => void;
  run: (action: () => Promise<void>) => Promise<void>;
  t: (text: string) => string;
  setNotice: (text: string, tone?: "info" | "success") => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [images, setImages] = useState<NativeImage[]>([]);
  const [selectedImage, selectImage] = useState<NativeImage>();
  const [loadingImages, setLoading] = useState(false);
  const [imageError, setError] = useState("");
  useEffect(() => {
    let active = true;
    setImages([]);
    selectImage(undefined);
    setError("");
    setLoading(false);
    const page = doc?.pages[pageIndex];
    if (doc && page) {
      setLoading(true);
      void extractNativeImages(
        doc.sources[page.source],
        page.index,
        page.rotation,
      )
        .then((result) => {
          if (active) setImages(result);
        })
        .catch(() => {
          if (active)
            setError("Impossible de détecter les images de cette page.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [doc, pageIndex]);
  async function deleteImage() {
    if (!doc || !selectedImage) return;
    await run(async () => {
      try {
        commit(await removeNativeImage(doc, pageIndex, selectedImage));
        setNotice(
          t("Image intégrée supprimée. Vous pouvez annuler cette action."),
          "success",
        );
      } catch (error) {
        if (error instanceof Error && error.message === "IMAGE_OVERLAP") {
          setNotice(
            t(
              "Cette image chevauche une autre image. La suppression isolée n’est pas disponible.",
            ),
          );
          return;
        }
        throw error;
      }
    });
  }
  return {
    enabled,
    setEnabled,
    images,
    selectedImage,
    selectImage,
    loadingImages,
    imageError,
    deleteImage,
  };
}
