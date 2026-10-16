import { Redis } from "@upstash/redis";
import type { ChaiStats } from "../physics/bayes";
import type { DunkRecord } from "../types";

export type Board = "longest" | "accurate" | "humiliation";

export interface Store {
  kind: "redis" | "memory";
  saveDunk(rec: DunkRecord): Promise<void>;
  getDunk(id: string): Promise<DunkRecord | null>;
  getDunks(ids: string[]): Promise<DunkRecord[]>;
  /** Higher score = better rank, except `accurate` which is ascending. */
  addToBoard(board: Board, id: string, score: number): Promise<void>;
  topOfBoard(board: Board, limit: number): Promise<{ id: string; score: number }[]>;
  getChaiStats(chaiType: string): Promise<ChaiStats>;
  setChaiStats(chaiType: string, stats: ChaiStats): Promise<void>;
}

const TTL_S = 60 * 60 * 24 * 120;

function redisStore(redis: Redis): Store {
  return {
    kind: "redis",
    async saveDunk(rec) {
      await redis.set(`dunk:${rec.id}`, JSON.stringify(rec), { ex: TTL_S });
    },
    async getDunk(id) {
      const v = await redis.get<DunkRecord | string>(`dunk:${id}`);
      if (!v) return null;
      return typeof v === "string" ? (JSON.parse(v) as DunkRecord) : v;
    },
    async getDunks(ids) {
      if (!ids.length) return [];
      const vals = await redis.mget<(DunkRecord | string | null)[]>(...ids.map((i) => `dunk:${i}`));
      return vals
        .filter((v): v is DunkRecord | string => !!v)
        .map((v) => (typeof v === "string" ? (JSON.parse(v) as DunkRecord) : v));
    },
    async addToBoard(board, id, score) {
      await redis.zadd(`lb:${board}`, { score, member: id });
    },
    async topOfBoard(board, limit) {
      const raw = await redis.zrange<(string | number)[]>(`lb:${board}`, 0, limit - 1, {
        rev: board !== "accurate",
        withScores: true,
      });
      const out: { id: string; score: number }[] = [];
      for (let i = 0; i < raw.length; i += 2) out.push({ id: String(raw[i]), score: Number(raw[i + 1]) });
      return out;
    },
    async getChaiStats(chaiType) {
      const h = await redis.hgetall<{ n?: string | number; sum?: string | number }>(`chai:${chaiType}`);
      return { n: Number(h?.n ?? 0), sumLogRatio: Number(h?.sum ?? 0) };
    },
    async setChaiStats(chaiType, stats) {
      await redis.hset(`chai:${chaiType}`, { n: stats.n, sum: stats.sumLogRatio });
    },
  };
}

function memoryStore(): Store {
  const dunks = new Map<string, DunkRecord>();
  const boards: Record<Board, Map<string, number>> = {
    longest: new Map(),
    accurate: new Map(),
    humiliation: new Map(),
  };
  const chai = new Map<string, ChaiStats>();
  return {
    kind: "memory",
    async saveDunk(rec) {
      dunks.set(rec.id, structuredClone(rec));
    },
    async getDunk(id) {
      return structuredClone(dunks.get(id) ?? null);
    },
    async getDunks(ids) {
      return ids.map((i) => dunks.get(i)).filter((d): d is DunkRecord => !!d);
    },
    async addToBoard(board, id, score) {
      boards[board].set(id, score);
    },
    async topOfBoard(board, limit) {
      const asc = board === "accurate";
      return [...boards[board].entries()]
        .sort((a, b) => (asc ? a[1] - b[1] : b[1] - a[1]))
        .slice(0, limit)
        .map(([id, score]) => ({ id, score }));
    },
    async getChaiStats(chaiType) {
      return chai.get(chaiType) ?? { n: 0, sumLogRatio: 0 };
    },
    async setChaiStats(chaiType, stats) {
      chai.set(chaiType, stats);
    },
  };
}

// Survive Next.js dev hot reloads.
const g = globalThis as unknown as { __dunkStore?: Store };

export function getStore(): Store {
  if (g.__dunkStore) return g.__dunkStore;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  g.__dunkStore = url && token ? redisStore(new Redis({ url, token })) : memoryStore();
  return g.__dunkStore;
}
