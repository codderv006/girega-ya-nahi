"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { APP_SLUG, LOADING_LINES } from "@/lib/config";
import type { StageEvent } from "@/lib/types";
import { Histogram } from "./Histogram";

export interface ConsoleStage {
  index: number;
  id: string;
  name: string;
  status: "running" | "done";
  data?: StageEvent;
}

const pad = (n: number) => String(n).padStart(2, "0");

function fmt(v: unknown): string {
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v);
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v === null) return "null";
  return JSON.stringify(v);
}

function KV({ obj, tone }: { obj: Record<string, unknown>; tone: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
      {Object.entries(obj).map(([k, v]) =>
        v && typeof v === "object" && !Array.isArray(v) ? (
          <div key={k} className="col-span-2">
            <span className="text-[#8c7a5e]">{k}:</span>
            <div className="ml-3">
              <KV obj={v as Record<string, unknown>} tone={tone} />
            </div>
          </div>
        ) : (
          <div key={k} className="contents">
            <span className="text-[#8c7a5e]">{k}</span>
            <span className={`${tone} break-all`}>{fmt(v)}</span>
          </div>
        ),
      )}
    </div>
  );
}

function StageRow({ s, defaultOpen }: { s: ConsoleStage; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [line] = useState(() => LOADING_LINES[s.index % LOADING_LINES.length]);
  const d = s.data;
  return (
    <motion.li initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="border-b border-white/5 py-2">
      <button
        type="button"
        onClick={() => d && setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={open}
        disabled={!d}
      >
        <span className="text-[#8c7a5e]">[{pad(s.index)}]</span>
        {s.status === "running" ? (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-wrapper-yellow border-t-transparent" aria-hidden />
        ) : (
          <span className="text-[#7bd88f]">✓</span>
        )}
        <span className="flex-1 font-semibold text-console-fg">{s.name}</span>
        {d && <span className="tabular-nums text-[#8c7a5e]">{d.ms < 1 ? d.ms.toFixed(2) : Math.round(d.ms)}ms</span>}
        {d && <span className="text-[#8c7a5e]">{open ? "▾" : "▸"}</span>}
      </button>
      {s.status === "running" && <p className="caret ml-9 mt-1 text-[#c8b48f]">{line}</p>}
      <AnimatePresence initial={false}>
        {d && open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-9 overflow-hidden"
          >
            <div className="mt-1.5 space-y-2 text-[12px] leading-relaxed">
              {d.formula && <div className="rounded bg-black/30 px-2 py-1 text-wrapper-yellow">ƒ {d.formula}</div>}
              {d.logs.map((l, i) => (
                <div key={i} className="text-[#c8b48f]">
                  <span className="text-[#8c7a5e]">›</span> {l}
                </div>
              ))}
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="mb-0.5 text-[10px] uppercase tracking-widest text-[#8c7a5e]">in</div>
                  <KV obj={d.inputs} tone="text-[#9cc9ff]" />
                </div>
                <div>
                  <div className="mb-0.5 text-[10px] uppercase tracking-widest text-[#8c7a5e]">out</div>
                  <KV obj={d.output} tone="text-[#ffb86b]" />
                </div>
              </div>
              {d.histogram && <Histogram bins={d.histogram} marker={Number(d.output.median_s)} />}
              <details className="text-[11px]">
                <summary className="cursor-pointer text-[#8c7a5e] hover:text-console-fg">raw event JSON</summary>
                <pre className="mt-1 max-h-48 overflow-auto rounded bg-black/40 p-2 text-[#c8b48f]">{JSON.stringify(d, null, 2)}</pre>
              </details>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export function BackendConsole({ stages, error, done, className = "" }: { stages: ConsoleStage[]; error?: string | null; done: boolean; className?: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const total = stages.reduce((a, s) => a + (s.data?.ms ?? 0), 0);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [stages]);

  return (
    <section className={`flex min-h-0 flex-col overflow-hidden rounded-2xl bg-console font-mono text-[13px] text-console-fg shadow-2xl ${className}`} aria-label="Backend console">
      <header className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-wrapper-red" />
        <span className="h-3 w-3 rounded-full bg-wrapper-yellow" />
        <span className="h-3 w-3 rounded-full bg-[#7bd88f]" />
        <span className="ml-2 truncate text-[#c8b48f]">{APP_SLUG}-api · POST /api/predict · ap-south-1</span>
        <span className="ml-auto shrink-0 text-[11px] text-[#8c7a5e]">{done ? `${stages.length}/10 · ${Math.round(total)}ms compute` : "streaming…"}</span>
      </header>
      <div ref={scroller} className="console-scroll min-h-0 flex-1 overflow-y-auto px-4 py-2">
        <p className="text-[#8c7a5e]">$ curl -N -X POST /api/predict --data @dunk.json</p>
        <p className="mb-1 text-[#8c7a5e]">→ 200 OK · content-type: text/event-stream</p>
        <ul>
          {stages.map((s) => (
            <StageRow key={s.id} s={s} defaultOpen={["washburn", "montecarlo", "verdict"].includes(s.id)} />
          ))}
        </ul>
        {error && <p className="mt-2 rounded bg-wrapper-red/20 p-2 text-[#ff9a9a]">✗ {error}</p>}
        {done && !error && <p className="mt-2 text-[#7bd88f]">✓ Pipeline complete. The biscuit has been informed.</p>}
      </div>
    </section>
  );
}
