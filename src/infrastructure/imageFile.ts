export async function readImageFile(
  file: File,
): Promise<{ data: string; width: number; height: number }> {
  if (!["image/png", "image/jpeg"].includes(file.type))
    throw new Error("IMAGE_FILE_FORMAT: PNG or JPEG required");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("IMAGE_FILE_SIZE: maximum 20 MB");
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const image = new Image();
  image.src = data;
  await image.decode();
  return { data, width: image.naturalWidth, height: image.naturalHeight };
}
