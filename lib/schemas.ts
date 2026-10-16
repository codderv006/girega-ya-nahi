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
