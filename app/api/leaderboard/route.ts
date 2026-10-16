import { getLeaderboard } from "@/lib/leaderboard";
import type { Board } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOARDS: Board[] = ["longest", "accurate", "humiliation"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const board = (url.searchParams.get("board") ?? "longest") as Board;
  if (!BOARDS.includes(board)) return Response.json({ error: "Unknown board" }, { status: 400 });
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
  return Response.json(await getLeaderboard(board, limit));
}
