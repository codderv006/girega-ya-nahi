export interface PreparedImage {
  mimeType: "image/jpeg";
  data: string; // base64, no prefix
  previewUrl: string;
  /** Share of golden, biscuit-coloured pixels in the central region (0..1). */
  colourScore: number;
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
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { mimeType: "image/jpeg", data: dataUrl.split(",")[1], previewUrl: dataUrl, colourScore: biscuitColourScore(ctx, canvas.width, canvas.height) };
}

/**
 * Offline biscuit detector: fraction of pixels in the central 70% of the frame
 * whose colour falls in the baked-golden range (hue 18–50°, moderately saturated,
 * not too dark or blown out). A mug, a face or a keyboard scores near zero.
 */
export function biscuitColourScore(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const x0 = Math.floor(w * 0.15);
  const y0 = Math.floor(h * 0.15);
  const cw = Math.max(1, Math.floor(w * 0.7));
  const ch = Math.max(1, Math.floor(h * 0.7));
  const px = ctx.getImageData(x0, y0, cw, ch).data;
  let hits = 0;
  let total = 0;
  for (let i = 0; i < px.length; i += 4 * 3) {
    total++;
    if (isBiscuitColour(px[i], px[i + 1], px[i + 2])) hits++;
  }
  return total ? hits / total : 0;
}

export function isBiscuitColour(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max / 255;
  const s = max === 0 ? 0 : (max - min) / max;
  if (v < 0.35 || v > 0.97 || s < 0.22 || s > 0.85) return false;
  if (max !== r) return false; // golden-brown is red-dominant
  const hue = (60 * (g - b)) / (max - min || 1);
  return hue >= 18 && hue <= 50;
}
