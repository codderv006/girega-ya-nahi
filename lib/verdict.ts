import { APP_NAME } from "./config";
import type { DunkRecord, DunkResult, VerdictTier } from "./types";

export function judge(predictedS: number, actualS: number, outcome: "fell" | "survived"): Pick<DunkResult, "errorS" | "tier" | "verdict"> {
  const errorS = actualS - predictedS;
  let tier: VerdictTier;
  if (outcome === "survived") tier = actualS >= predictedS ? "beat" : "chicken";
  else if (Math.abs(errorS) <= 0.5) tier = "oracle";
  else if (errorS > 0) tier = "beat";
  else tier = "betrayed";
  return { errorS, tier, verdict: VERDICTS[tier] };
}

export const VERDICTS: Record<VerdictTier, string> = {
  oracle: "The algorithm sees all.",
  beat: `You beat ${APP_NAME}`,
  betrayed: "Biscuit betrayed the model.",
  chicken: "Pulled out early. The biscuit thanks you.",
};

export function verdictHeadline(r: DunkResult): string {
  if (r.outcome === "survived") return r.tier === "beat" ? "Nahi gira!" : "Bacha liya.";
  return "Gir gaya.";
}

const f = (n: number) => Math.abs(n).toFixed(1);

/** The line that goes on the share card. */
export function shareLine(rec: DunkRecord): string {
  const r = rec.result;
  if (!r) return `${APP_NAME} gives my Parle-G ${rec.prediction.medianS.toFixed(1)}s to live. Pray for it.`;
  switch (r.tier) {
    case "oracle":
      return `${APP_NAME} predicted my biscuit's death to within ${f(r.errorS)}s. I'm scared.`;
    case "beat":
      return r.actualS > 10
        ? `My Parle-G survived ${r.actualS.toFixed(1)}s. Doctors are baffled.`
        : `I beat ${APP_NAME} by ${f(r.errorS)}s. G maane Genius. Mera G.`;
    case "betrayed":
      return `Lost a biscuit ${f(r.errorS)}s early. Even the model didn't see that coming.`;
    case "chicken":
      return `Pulled my Parle-G out at ${r.actualS.toFixed(1)}s. Survival over glory.`;
  }
}

export function caption(rec: DunkRecord, url?: string): string {
  const r = rec.result;
  const head = r ? `${APP_NAME} ${verdictHeadline(r)}` : APP_NAME;
  return [
    head,
    shareLine(rec),
    `Predicted: ${rec.prediction.medianS.toFixed(2)}s${r ? ` · Actual: ${r.actualS.toFixed(2)}s` : ""}`,
    url ?? "",
    "#GDGMAD @gdgmad #DevFestMumbai",
  ]
    .filter(Boolean)
    .join("\n");
}
