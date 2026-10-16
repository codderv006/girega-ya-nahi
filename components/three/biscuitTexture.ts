import * as THREE from "three";

/**
 * Procedural glucose-biscuit face: golden base with bake speckle, an embossed
 * wheat-ear border, a recessed inner panel and stamped lettering.
 * Drawn twice: once in colour (map) and once in greyscale height (bumpMap).
 */
const W = 600;
const H = 800;

type Mode = "color" | "height";

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw a raised shape: highlight up-left, shadow down-right, face on top. */
function emboss(ctx: CanvasRenderingContext2D, mode: Mode, draw: () => void, face: string, depth = 2.5) {
  const hi = mode === "color" ? "rgba(255,230,180,0.55)" : "#ffffff";
  const lo = mode === "color" ? "rgba(120,70,25,0.45)" : "#5a5a5a";
  ctx.save();
  ctx.translate(-depth, -depth);
  ctx.fillStyle = hi;
  draw();
  ctx.translate(depth * 2, depth * 2);
  ctx.fillStyle = lo;
  draw();
  ctx.restore();
  ctx.fillStyle = face;
  draw();
}

function paint(ctx: CanvasRenderingContext2D, mode: Mode, label: string) {
  const c = mode === "color";
  const rng = mulberry(7);

  // Base
  if (c) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, H * 0.7);
    g.addColorStop(0, "#E2B06C");
    g.addColorStop(1, "#D29A55");
    ctx.fillStyle = g;
  } else ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, W, H);

  // Bake speckle
  if (c) {
    for (let i = 0; i < 2600; i++) {
      const dark = rng() < 0.6;
      ctx.fillStyle = dark ? `rgba(150,95,40,${0.08 + rng() * 0.12})` : `rgba(255,225,170,${0.08 + rng() * 0.12})`;
      ctx.fillRect(rng() * W, rng() * H, 1 + rng() * 2.5, 1 + rng() * 2.5);
    }
  }

  const raised = c ? "#DCA764" : "#bcbcbc";
  const m = 34; // outer margin
  const band = 64; // border band width

  // Wheat-ear ridges along the border band
  const ridge = (x: number, y: number, w: number, h: number) => () => {
    roundRect(ctx, x, y, w, h, Math.min(w, h) / 2);
    ctx.fill();
  };
  const step = 30;
  for (let y = m + band; y < H - m - band; y += step) {
    for (const side of [0, 1]) {
      const x0 = side === 0 ? m + 6 : W - m - band + 6;
      emboss(ctx, mode, ridge(x0, y + 4, band / 2 - 8, 11), raised);
      emboss(ctx, mode, ridge(x0 + band / 2 - 2, y + 4, band / 2 - 8, 11), raised);
    }
  }
  for (let x = m + band; x < W - m - band; x += step) {
    for (const side of [0, 1]) {
      const y0 = side === 0 ? m + 6 : H - m - band + 6;
      emboss(ctx, mode, ridge(x + 4, y0, 11, band / 2 - 8), raised);
      emboss(ctx, mode, ridge(x + 4, y0 + band / 2 - 2, 11, band / 2 - 8), raised);
    }
  }
  // Corner knots
  for (const [x, y] of [
    [m + band / 2, m + band / 2],
    [W - m - band / 2, m + band / 2],
    [m + band / 2, H - m - band / 2],
    [W - m - band / 2, H - m - band / 2],
  ]) {
    emboss(ctx, mode, () => {
      ctx.beginPath();
      ctx.arc(x, y, 17, 0, Math.PI * 2);
      ctx.fill();
    }, raised);
  }

  // Inner panel edge (a raised frame line)
  const px = m + band + 8;
  const py = m + band + 8;
  ctx.lineWidth = 7;
  const frame = () => {
    roundRect(ctx, px, py, W - px * 2, H - py * 2, 22);
    ctx.stroke();
  };
  ctx.save();
  ctx.strokeStyle = c ? "rgba(255,230,180,0.6)" : "#ffffff";
  ctx.translate(-2, -2);
  frame();
  ctx.strokeStyle = c ? "rgba(120,70,25,0.45)" : "#5a5a5a";
  ctx.translate(4, 4);
  frame();
  ctx.restore();
  ctx.strokeStyle = raised;
  frame();

  // Stamped lettering, running along the long side
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "bold 112px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  emboss(ctx, mode, () => ctx.fillText(label, 0, 6), raised, 3);
  ctx.restore();
}

export function makeBiscuitTextures(label = "Girega?") {
  const make = (mode: Mode) => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    paint(canvas.getContext("2d")!, mode, label);
    const t = new THREE.CanvasTexture(canvas);
    if (mode === "color") t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return { map: make("color"), bump: make("height") };
}
