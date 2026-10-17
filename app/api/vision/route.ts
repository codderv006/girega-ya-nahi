import { createHash } from "node:crypto";
import { VisionCheckRequest, type VisionCheckResponse } from "@/lib/schemas";
import { checkBiscuit } from "@/lib/vision/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Scan-time check: is this a biscuit, shot from above? Its analysis is reused by /api/predict. */
export async function POST(request: Request) {
  const parsed = VisionCheckRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Send an image to inspect." }, { status: 400 });

  const { image, colourScore } = parsed.data;
  const hash = createHash("sha256").update(image.data).digest("hex");
  const { verdict, message, outcome } = await checkBiscuit(image, colourScore, hash);

  const body: VisionCheckResponse = {
    verdict,
    message,
    vision: {
      source: outcome.source === "gemini" ? "gemini" : "fallback",
      model: outcome.model,
      biscuit: outcome.result.biscuit,
    },
  };
  return Response.json(body);
}
