import { ResultRequest } from "@/lib/schemas";
import { getStore } from "@/lib/store";
import { addObservation } from "@/lib/physics/bayes";
import { judge } from "@/lib/verdict";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = ResultRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid result", issues: parsed.error.issues }, { status: 400 });
  }
  const { id, actualS, outcome, nickname } = parsed.data;
  const store = getStore();
  const rec = await store.getDunk(id);
  if (!rec) return Response.json({ error: "Unknown dunk. Did the server restart? (In-memory mode forgets.)" }, { status: 404 });
  if (rec.result) return Response.json({ record: rec, duplicate: true });

  const predicted = rec.prediction.medianS;
  rec.result = { actualS, outcome, nickname: nickname || undefined, at: Date.now(), ...judge(predicted, actualS, outcome) };
  await store.saveDunk(rec);

  await store.addToBoard("longest", id, actualS);
  if (outcome === "fell") await store.addToBoard("accurate", id, Math.abs(rec.result.errorS));
  if (rec.result.errorS > 0) await store.addToBoard("humiliation", id, rec.result.errorS);

  // Learning loop: a fall is a full observation; surviving past the prediction is a
  // (conservative) lower bound; chickening out early tells us nothing.
  if (outcome === "fell" || actualS > predicted) {
    const raw = predicted / (rec.prediction.correctionFactor || 1);
    const stats = await store.getChaiStats(rec.inputs.chaiType);
    await store.setChaiStats(rec.inputs.chaiType, addObservation(stats, raw, actualS));
  }

  return Response.json({ record: rec });
}
