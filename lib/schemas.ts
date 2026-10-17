import { z } from "zod";
import { CHAI_TYPES, DUNK_STYLES, HEAT_MAX_C, HEAT_MIN_C, VESSELS } from "./config";

const ids = <T extends readonly { id: string }[]>(list: T) =>
  list.map((x) => x.id) as unknown as [T[number]["id"], ...T[number]["id"][]];

// ~3 MB of base64 is plenty for a client-downscaled JPEG.
export const ImagePayload = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  data: z.string().min(16).max(3_000_000),
});

export const PredictRequest = z.object({
  chaiType: z.enum(ids(CHAI_TYPES)),
  vessel: z.enum(ids(VESSELS)),
  tempC: z.number().min(HEAT_MIN_C).max(HEAT_MAX_C),
  dunkDepth: z.number().min(0.1).max(0.9),
  style: z.enum(ids(DUNK_STYLES)),
  biscuitImage: ImagePayload.optional(),
  chaiImage: ImagePayload.optional(),
  biscuitVision: z.lazy(() => CachedVision).optional(),
});
export type PredictRequest = z.infer<typeof PredictRequest>;

export const ResultRequest = z.object({
  id: z.string().min(4).max(40),
  actualS: z.number().min(0).max(600),
  outcome: z.enum(["fell", "survived"]),
  nickname: z
    .string()
    .trim()
    .max(24)
    .optional()
    .transform((s) => (s ? s.replace(/[^\p{L}\p{N} _.\-]/gu, "") : undefined)),
});
export type ResultRequest = z.infer<typeof ResultRequest>;

export const VisionResult = z.object({
  biscuit: z.object({
    isGlucoseBiscuit: z.boolean(),
    /** Any biscuit/cookie at all (a Marie still counts; a mug does not). */
    isBiscuit: z.boolean().optional(),
    /** Photographed face-on from above (not edge-on). */
    isTopView: z.boolean().optional(),
    /** What the photo actually shows, in a few words. */
    subject: z.string().max(60).optional(),
    confidence: z.number().min(0).max(1),
    brokenEdges: z.number().int().min(0).max(4),
    thicknessMm: z.number().min(2).max(12),
    defectScore: z.number().min(0).max(1),
    notes: z.string().max(200),
  }),
  chai: z
    .object({
      milkiness: z.number().min(0).max(1),
      steamVisible: z.boolean(),
      notes: z.string().max(200),
    })
    .nullable(),
});
export type VisionResult = z.infer<typeof VisionResult>;

/** Scan-time vision analysis, reused by the pipeline so Gemini is called once per dunk. */
export const CachedVision = z.object({
  source: z.enum(["gemini", "fallback"]),
  model: z.string().max(60).optional(),
  biscuit: VisionResult.shape.biscuit,
});
export type CachedVision = z.infer<typeof CachedVision>;

export const VisionCheckRequest = z.object({
  image: ImagePayload,
  /** On-device fraction of biscuit-coloured pixels (0..1), the offline fallback signal. */
  colourScore: z.number().min(0).max(1),
});

export type VisionVerdict = "biscuit" | "not-biscuit" | "side-view" | "unverified";
export interface VisionCheckResponse {
  verdict: VisionVerdict;
  message: string;
  vision: CachedVision;
}
