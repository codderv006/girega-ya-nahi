import { GoogleGenAI, Type } from "@google/genai";
import { VisionResult } from "../schemas";
import { mulberry32, seedFromString } from "../physics/rng";

type Image = { mimeType: string; data: string };

export interface VisionOutcome {
  source: "gemini" | "fallback" | "standard-issue";
  model?: string;
  result: VisionResult;
  error?: string;
}

export const STANDARD_ISSUE: VisionResult = {
  biscuit: {
    isGlucoseBiscuit: true,
    confidence: 1,
    brokenEdges: 0,
    thicknessMm: 4.8,
    defectScore: 0.1,
    notes: "Standard-issue glucose biscuit. Factory fresh. Blissfully unaware.",
  },
  chai: null,
};

const PROMPT = `You are the vision subsystem of a dead-serious biscuit dunking physics lab.
Image 1 is a biscuit (ideally a rectangular glucose biscuit). Image 2, if present, is a cup of chai.
Return strict JSON only:
- biscuit.isGlucoseBiscuit: is it a plain rectangular glucose biscuit?
- biscuit.confidence: 0..1
- biscuit.brokenEdges: number of visibly broken/chipped edges (0-4)
- biscuit.thicknessMm: estimated thickness in mm (glucose biscuits are ~4-6mm)
- biscuit.defectScore: 0..1 cracks, chips, crumbling
- biscuit.notes: one short, deadpan scientific remark about the biscuit (max 20 words)
- chai: null if no chai image; else milkiness 0..1 (0 = black tea, 1 = basically milk), steamVisible, notes (one deadpan remark, max 20 words)
If image 1 is not a biscuit, set isGlucoseBiscuit false and still estimate the fields as if it were going to be dunked.`;

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    biscuit: {
      type: Type.OBJECT,
      properties: {
        isGlucoseBiscuit: { type: Type.BOOLEAN },
        confidence: { type: Type.NUMBER },
        brokenEdges: { type: Type.INTEGER },
        thicknessMm: { type: Type.NUMBER },
        defectScore: { type: Type.NUMBER },
        notes: { type: Type.STRING },
      },
      required: ["isGlucoseBiscuit", "confidence", "brokenEdges", "thicknessMm", "defectScore", "notes"],
    },
    chai: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        milkiness: { type: Type.NUMBER },
        steamVisible: { type: Type.BOOLEAN },
        notes: { type: Type.STRING },
      },
      required: ["milkiness", "steamVisible", "notes"],
    },
  },
  required: ["biscuit", "chai"],
};

/** Deterministic pseudo-analysis keyed on the image hash, so the same photo always gets the same verdict. */
export function fallbackVision(imageHash: string, hasChai: boolean): VisionResult {
  const rng = mulberry32(seedFromString(imageHash));
  const r = () => rng();
  return {
    biscuit: {
      isGlucoseBiscuit: true,
      confidence: 0.62 + r() * 0.3,
      brokenEdges: r() < 0.7 ? 0 : r() < 0.7 ? 1 : 2,
      thicknessMm: 4.4 + r() * 0.9,
      defectScore: r() * 0.35,
      notes: "Offline heuristic analysis. The biscuit declined to comment.",
    },
    chai: hasChai
      ? { milkiness: 0.35 + r() * 0.5, steamVisible: r() > 0.4, notes: "Colour estimated by vibes." }
      : null,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export async function analyzeImages(
  biscuit: Image | undefined,
  chai: Image | undefined,
  imageHash: string,
): Promise<VisionOutcome> {
  if (!biscuit) return { source: "standard-issue", result: STANDARD_ISSUE };

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { source: "fallback", result: fallbackVision(imageHash, !!chai), error: "GEMINI_API_KEY not set" };
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const parts: { inlineData?: Image; text?: string }[] = [{ inlineData: biscuit }];
    if (chai) parts.push({ inlineData: chai });
    parts.push({ text: PROMPT });

    const res = await Promise.race([
      ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.2 },
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Gemini timed out after 12s")), 12_000)),
    ]);

    const raw = JSON.parse(res.text ?? "{}");
    // Clamp before validating: models occasionally get creative with ranges.
    if (raw?.biscuit) {
      raw.biscuit.confidence = clamp(Number(raw.biscuit.confidence) || 0, 0, 1);
      raw.biscuit.brokenEdges = clamp(Math.round(Number(raw.biscuit.brokenEdges) || 0), 0, 4);
      raw.biscuit.thicknessMm = clamp(Number(raw.biscuit.thicknessMm) || 4.8, 2, 12);
      raw.biscuit.defectScore = clamp(Number(raw.biscuit.defectScore) || 0, 0, 1);
      raw.biscuit.notes = String(raw.biscuit.notes ?? "").slice(0, 200);
    }
    if (raw?.chai) {
      raw.chai.milkiness = clamp(Number(raw.chai.milkiness) || 0.5, 0, 1);
      raw.chai.notes = String(raw.chai.notes ?? "").slice(0, 200);
    }
    if (!chai) raw.chai = null;
    const parsed = VisionResult.parse(raw);
    return { source: "gemini", model, result: parsed };
  } catch (e) {
    return {
      source: "fallback",
      model,
      result: fallbackVision(imageHash, !!chai),
      error: e instanceof Error ? e.message.slice(0, 160) : "unknown error",
    };
  }
}
