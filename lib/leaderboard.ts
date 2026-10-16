import { getStore, type Board } from "./store";

export interface LeaderboardEntry {
  rank: number;
  id: string;
  nickname: string;
  chaiType: string;
  style: string;
  predictedS: number;
  actualS: number;
  errorS: number;
  score: number;
}

export async function getLeaderboard(board: Board, limit = 20) {
  const store = getStore();
  const top = await store.topOfBoard(board, limit);
  const recs = await store.getDunks(top.map((t) => t.id));
  const byId = new Map(recs.map((r) => [r.id, r]));
  const entries: LeaderboardEntry[] = [];
  for (const t of top) {
    const r = byId.get(t.id);
    if (!r?.result) continue;
    entries.push({
      rank: entries.length + 1,
      id: r.id,
      nickname: r.result.nickname || "Anonymous dunker",
      chaiType: r.inputs.chaiType,
      style: r.inputs.style,
      predictedS: r.prediction.medianS,
      actualS: r.result.actualS,
      errorS: r.result.errorS,
      score: t.score,
    });
  }
  return { board, store: store.kind, entries };
}
