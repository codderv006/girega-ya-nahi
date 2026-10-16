"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { APP_NAME } from "@/lib/config";
import type { Mood } from "@/lib/mascot";
import type { DunkRecord } from "@/lib/types";
import { Mascot } from "../Mascot";

type Phase = "ready" | "running" | "stopped" | "saving" | "done";

export function TestStep({ record, onRecord, onNext, onBack }: { record: DunkRecord; onRecord: (r: DunkRecord) => void; onNext: () => void; onBack: () => void }) {
  const predicted = record.prediction.medianS;
  const [phase, setPhase] = useState<Phase>(record.result ? "done" : "ready");
  const [elapsed, setElapsed] = useState(record.result?.actualS ?? 0);
  const [outcome, setOutcome] = useState<"fell" | "survived">(record.result?.outcome ?? "fell");
  const [nickname, setNickname] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const start = useRef(0);

  useEffect(() => {
    if (phase !== "running") return;
    let id = 0;
    const tick = () => {
      setElapsed((performance.now() - start.current) / 1000);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [phase]);

  function begin() {
    start.current = performance.now();
    setElapsed(0);
    setPhase("running");
    navigator.vibrate?.(40);
  }
  function stop(o: "fell" | "survived") {
    setElapsed((performance.now() - start.current) / 1000);
    setOutcome(o);
    setPhase("stopped");
    navigator.vibrate?.(o === "fell" ? [80, 60, 160] : 40);
  }
  async function save() {
    setPhase("saving");
    setErr(null);
    try {
      const res = await fetch("/api/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id, actualS: Math.round(elapsed * 100) / 100, outcome, nickname: nickname.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      onRecord(json.record);
      setPhase("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
      setPhase("stopped");
    }
  }

  const ratio = elapsed / predicted;
  const mood: Mood =
    phase === "ready" ? "nervous" : phase === "running" ? (ratio > 0.8 ? "sweating" : "nervous") : outcome === "fell" ? "dead" : "proud";

  const R = 120;
  const C = 2 * Math.PI * R;
  const prog = Math.min(1, ratio);
  const over = ratio > 1;

  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-4 pb-10 text-center sm:px-8">
      {phase === "ready" && (
        <>
          <h1 className="font-display text-4xl font-extrabold">Moment of truth.</h1>
          <p className="mt-1 max-w-sm text-ink/70">
            Hold the biscuit over the chai. Tap <b>Dunk now</b> the instant it touches. {APP_NAME} says <b>{predicted.toFixed(2)} s</b>.
          </p>
        </>
      )}

      <div className="relative mt-6 grid place-items-center">
        <svg viewBox="0 0 280 280" className="h-72 w-72 -rotate-90 sm:h-80 sm:w-80" aria-hidden>
          <circle cx="140" cy="140" r={R} fill="none" stroke="rgb(201 143 62 / .25)" strokeWidth="18" />
          <circle
            cx="140"
            cy="140"
            r={R}
            fill="none"
            stroke={over ? "#D7263D" : "#A0642B"}
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - prog)}
          />
          {/* predicted-time marker sits at 12 o'clock = 100% */}
        </svg>
        {phase === "running" && (
          <motion.span
            className="absolute inset-6 rounded-full border-4 border-wrapper-red/40"
            animate={{ scale: [1, 1.06, 1], opacity: [0.6, 0.1, 0.6] }}
            transition={{ duration: over ? 0.5 : 1.1, repeat: Infinity }}
          />
        )}
        <div className="absolute flex flex-col items-center">
          <Mascot mood={mood} wet={Math.min(0.8, ratio * 0.5)} size={92} />
          <span className={`font-display text-6xl font-extrabold tabular-nums leading-none ${over ? "text-wrapper-red" : ""}`}>{elapsed.toFixed(2)}</span>
          <span className="font-mono text-xs text-ink/60">predicted {predicted.toFixed(2)} s</span>
        </div>
      </div>

      {phase === "ready" && (
        <div className="mt-6 flex w-full flex-col gap-2">
          <button className="btn-primary !py-[1.1em] !text-2xl" onClick={begin}>Dunk now</button>
          <button className="text-sm font-semibold text-ink/60 underline" onClick={onBack}>← Back to prediction</button>
        </div>
      )}

      {phase === "running" && (
        <div className="mt-6 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          <button className="btn-primary !py-[1.1em] !text-2xl" onClick={() => stop("fell")}>It fell! 💀</button>
          <button className="btn-secondary py-5" onClick={() => stop("survived")}>I pulled it out alive</button>
          <p className="text-sm text-ink/60 sm:col-span-2">{over ? "Past the prediction. The model is sweating too." : ratio > 0.8 ? "Any second now…" : "Steady wrist. Breathe."}</p>
        </div>
      )}

      {(phase === "stopped" || phase === "saving") && (
        <div className="mt-6 w-full rounded-3xl border border-ink/10 bg-white p-5 text-left shadow-sm">
          <p className="font-display text-2xl font-extrabold">{outcome === "fell" ? `Gir gaya at ${elapsed.toFixed(2)} s.` : `Survived ${elapsed.toFixed(2)} s.`}</p>
          <p className="text-sm text-ink/70">Submit to science so the model learns. Nickname is optional and goes on the leaderboard.</p>
          <input
            className="mt-3 w-full rounded-xl border border-ink/15 bg-cream px-3 py-3 text-lg outline-none focus:border-wrapper-red"
            placeholder="Nickname (optional)"
            maxLength={24}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          {err && <p className="mt-2 text-sm font-semibold text-wrapper-red">{err}</p>}
          <div className="mt-3 flex gap-2">
            <button className="btn-primary flex-1" onClick={save} disabled={phase === "saving"}>{phase === "saving" ? "Peer-reviewing…" : "Submit to science"}</button>
            <button className="btn-secondary" onClick={() => setPhase("ready")} disabled={phase === "saving"}>Redo</button>
          </div>
        </div>
      )}

      {phase === "done" && record.result && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-6 w-full rounded-3xl border border-ink/10 bg-white p-5 shadow-sm">
          <p className="font-display text-3xl font-extrabold text-wrapper-red">{record.result.verdict}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="Predicted" value={`${predicted.toFixed(2)}s`} />
            <Stat label={record.result.outcome === "fell" ? "Actual" : "Survived"} value={`${record.result.actualS.toFixed(2)}s`} />
            <Stat label="Error" value={`${record.result.errorS >= 0 ? "+" : ""}${record.result.errorS.toFixed(2)}s`} />
          </div>
          <button className="btn-primary mt-4 w-full" onClick={onNext}>Make my share card</button>
        </motion.div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream p-2">
      <div className="one-line text-[11px] font-semibold uppercase tracking-wide text-chai">{label}</div>
      <div className="whitespace-nowrap font-display text-2xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}
