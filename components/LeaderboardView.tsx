"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CHAI_TYPES, DUNK_STYLES, labelOf } from "@/lib/config";
import type { LeaderboardEntry } from "@/lib/leaderboard";

const TABS = [
  { id: "longest", label: "Longest survivor", blurb: "Biscuits that refused to die.", metric: (e: LeaderboardEntry) => `${e.actualS.toFixed(2)}s` },
  { id: "accurate", label: "Most accurate", blurb: "Closest calls. The algorithm sees all.", metric: (e: LeaderboardEntry) => `±${Math.abs(e.errorS).toFixed(2)}s` },
  { id: "humiliation", label: "Biggest humiliation", blurb: "Biscuits that made the model look silly.", metric: (e: LeaderboardEntry) => `+${e.errorS.toFixed(2)}s` },
] as const;

export function LeaderboardView() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("longest");
  const [data, setData] = useState<{ entries: LeaderboardEntry[]; store: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/leaderboard?board=${tab}&limit=25`)
      .then((r) => r.json())
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ entries: [], store: "unknown" }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tab]);

  const t = TABS.find((x) => x.id === tab)!;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8">
      <h1 className="font-display text-4xl font-extrabold">Hall of Dunks</h1>
      <p className="text-ink/70">Har dunk ka hisaab.</p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist">
        {TABS.map((x) => (
          <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${tab === x.id ? "border-ink bg-ink text-white" : "border-ink/15 bg-white hover:border-ink/40"}`}>
            {x.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-ink/60">{t.blurb}</p>

      <ol className="mt-4 space-y-2">
        {loading && <li className="rounded-2xl border border-ink/10 bg-white p-4 text-ink/60">Consulting the chai elders…</li>}
        {!loading && data?.entries.length === 0 && (
          <li className="rounded-2xl border border-ink/10 bg-white p-6 text-center">
            <p className="font-display text-xl font-bold">No dunks yet.</p>
            <p className="text-sm text-ink/60">History is waiting for its first biscuit.</p>
            <Link href="/dunk" className="btn-primary mt-3">Be the first</Link>
          </li>
        )}
        {!loading &&
          data?.entries.map((e) => (
            <li key={e.id}>
              <Link href={`/r/${e.id}`} className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-3 transition hover:border-ink/30">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-lg font-extrabold ${e.rank === 1 ? "bg-wrapper-yellow" : e.rank <= 3 ? "bg-biscuit" : "bg-cream"}`}>{e.rank}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-lg font-bold">{e.nickname}</span>
                  <span className="block truncate text-xs text-ink/60">
                    {labelOf(CHAI_TYPES, e.chaiType)} · {labelOf(DUNK_STYLES, e.style)} · predicted {e.predictedS.toFixed(2)}s
                  </span>
                </span>
                <span className="shrink-0 whitespace-nowrap font-display text-2xl font-extrabold tabular-nums text-wrapper-red">{t.metric(e)}</span>
              </Link>
            </li>
          ))}
      </ol>
      {data?.store === "memory" && <p className="mt-4 text-xs text-ink/50">Running on in-memory storage. The leaderboard resets when the server restarts.</p>}
    </section>
  );
}
