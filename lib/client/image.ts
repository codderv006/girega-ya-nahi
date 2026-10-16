export interface PreparedImage {
  mimeType: "image/jpeg";
  data: string; // base64, no prefix
  previewUrl: string;
}

/** Downscale a photo on-device so we never ship a 12 MP biscuit to the server. */
export async function prepareImage(file: File, maxSide = 768, quality = 0.82): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file).catch(async () => {
    // Older Safari: fall back to an <img>
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  });
  const w = "width" in bitmap ? bitmap.width : 0;
  const h = "height" in bitmap ? bitmap.height : 0;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { mimeType: "image/jpeg", data: dataUrl.split(",")[1], previewUrl: dataUrl };
}
