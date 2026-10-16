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
const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

export function fallbackVision(imageHash: string, hasChai: boolean): VisionResult {
  const rng = mulberry32(seedFromString(imageHash));
  const r = () => rng();
  return {
    biscuit: {
      isGlucoseBiscuit: true,
      confidence: round(0.62 + r() * 0.3),
      brokenEdges: r() < 0.7 ? 0 : r() < 0.7 ? 1 : 2,
      thicknessMm: round(4.4 + r() * 0.9, 1),
      defectScore: round(r() * 0.35),
      notes: "Offline heuristic analysis. The biscuit declined to comment.",
    },
    chai: hasChai
      ? { milkiness: round(0.35 + r() * 0.5), steamVisible: r() > 0.4, notes: "Colour estimated by vibes." }
      : null,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Default model; override with GEMINI_MODEL. Google retires old models for new keys. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

/** Pull a readable message out of the SDK's error (often a JSON blob). */
function errorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  try {
    const j = JSON.parse(raw.slice(raw.indexOf("{")));
    if (j?.error?.message) return String(j.error.message);
  } catch {
    /* not JSON */
  }
  return raw;
}

/** When a model is retired, Google's 404 names its replacement ("use models/<name>"). */
export function suggestedModel(message: string): string | null {
  return message.match(/use (?:models\/)?(gemini-[\w.-]+?)[\s.,)]*(?:for|instead|$|\s)/i)?.[1] ?? null;
}

async function callModel(ai: GoogleGenAI, model: string, parts: { inlineData?: Image; text?: string }[]) {
  const res = await Promise.race([
    ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.2 },
    }),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Gemini timed out after 10s")), 10_000)),
  ]);
  return JSON.parse(res.text ?? "{}");
}

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

  let model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const ai = new GoogleGenAI({ apiKey: key });
  const parts: { inlineData?: Image; text?: string }[] = [{ inlineData: biscuit }];
  if (chai) parts.push({ inlineData: chai });
  parts.push({ text: PROMPT });

  try {
    let raw: Record<string, any>;
    try {
      raw = await callModel(ai, model, parts);
    } catch (e) {
      // Retired model: retry once with the replacement Google names in the error.
      const next = suggestedModel(errorMessage(e));
      if (!next || next === model) throw e;
      model = next;
      raw = await callModel(ai, model, parts);
    }

    // Clamp before validating: models occasionally get creative with ranges.
    if (raw?.biscuit) {
      raw.biscuit.confidence = round(clamp(Number(raw.biscuit.confidence) || 0, 0, 1));
      raw.biscuit.brokenEdges = clamp(Math.round(Number(raw.biscuit.brokenEdges) || 0), 0, 4);
      raw.biscuit.thicknessMm = round(clamp(Number(raw.biscuit.thicknessMm) || 4.8, 2, 12), 1);
      raw.biscuit.defectScore = round(clamp(Number(raw.biscuit.defectScore) || 0, 0, 1));
      raw.biscuit.notes = String(raw.biscuit.notes ?? "").slice(0, 200);
    }
    if (raw?.chai) {
      raw.chai.milkiness = round(clamp(Number(raw.chai.milkiness) || 0.5, 0, 1));
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
      error: errorMessage(e).slice(0, 200),
    };
  }
}
