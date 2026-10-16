"use client";

import { animate, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { streamPredict } from "@/lib/client/sse";
import { CHAI_FLUID } from "@/lib/physics/fluid";
import type { PredictRequest } from "@/lib/schemas";
import type { DunkRecord, PipelineEvent } from "@/lib/types";
import { BackendConsole, type ConsoleStage } from "../BackendConsole";
import { Mascot } from "../Mascot";
import { LazyScene } from "../three/LazyScene";
import type { SceneState } from "../three/types";

type Sheet = "peek" | "half" | "full";

export function PredictStep({
  request,
  scene,
  record,
  onRecord,
  onBack,
  onRerun,
  onNext,
}: {
  request: PredictRequest;
  scene: React.RefObject<SceneState>;
  record: DunkRecord | null;
  onRecord: (r: DunkRecord) => void;
  onBack: () => void;
  onRerun: () => void;
  onNext: () => void;
}) {
  const [stages, setStages] = useState<ConsoleStage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [sheet, setSheet] = useState<Sheet>("half");
  const reqRef = useRef(request);
  const done = !!record || !!error;

  useEffect(() => {
    const ac = new AbortController();
    setStages([]);
    setError(null);
    setEstimate(null);
    const s = scene.current;
    s.dip = 1;
    s.wet = 0.05;
    s.fall = 0;
    s.spin = false;
    s.snappy = false;
    s.tremble = true;
    s.milkiness = CHAI_FLUID[reqRef.current.chaiType].milkiness;

    const onEvent = (e: PipelineEvent) => {
      if (e.type === "stage-start") {
        setStages((prev) => [...prev, { index: e.index, id: e.id, name: e.name, status: "running" }]);
        s.wet = Math.min(0.6, e.index * 0.055);
      } else if (e.type === "stage-done") {
        setStages((prev) => prev.map((x) => (x.id === e.stage.id ? { ...x, status: "done", data: e.stage } : x)));
        const o = e.stage.output;
        if (e.stage.id === "washburn") setEstimate(Number(o.t_saturation_s));
        if (e.stage.id === "structural") setEstimate(Number(o.deterministicTTF_s));
        if (e.stage.id === "montecarlo") setEstimate(Number(o.median_s));
        if (e.stage.id === "vision" && (o as { chai?: { milkiness?: number } }).chai?.milkiness != null) {
          s.milkiness = Number((o as { chai: { milkiness: number } }).chai.milkiness);
        }
      } else if (e.type === "result") {
        setEstimate(e.record.prediction.medianS);
        s.tremble = false;
        onRecord(e.record);
        setSheet("peek");
      } else if (e.type === "error") {
        setError(e.message);
      }
    };

    streamPredict(reqRef.current, onEvent, ac.signal).catch((err) => {
      if (!ac.signal.aborted) setError(err instanceof Error ? err.message : "Connection to the chai lab was lost.");
    });
    return () => ac.abort();
    // onRecord is stable enough (setState); re-running would restart the pipeline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  const sheetH = { peek: "4.25rem", half: "55dvh", full: "88dvh" }[sheet];

  return (
    <section className="relative flex flex-1 flex-col lg:grid lg:grid-cols-2 lg:gap-0">
      {/* Visual side */}
      <div className="relative flex flex-col px-4 pb-22 sm:px-8 lg:pb-8">
        <div className="flex items-center justify-between">
          <button className="text-sm font-semibold text-ink/70 hover:text-ink" onClick={onBack}>← Change chai</button>
          <span className="font-mono text-xs text-ink/50">{stages.filter((s) => s.status === "done").length}/10 stages</span>
        </div>
        <div className="relative mx-auto mt-1 w-full max-w-lg">
          <LazyScene state={scene} dunkDepth={Math.round(request.dunkDepth * 20) / 20} compact className="h-[34dvh] min-h-52 lg:h-[46dvh]" fallbackMood={record ? "sweating" : "nervous"} fallbackWet={0.3} />
          <div className="absolute bottom-2 left-0 hidden sm:block">
            <Mascot mood={record ? "sweating" : "nervous"} size={88} />
          </div>
        </div>

        <div className="mx-auto w-full max-w-lg text-center">
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-chai">{record ? "Predicted survival" : "Computing time of death"}</p>
          <BigNumber value={estimate} final={!!record} />
          {record && (
            <p className="-mt-1 whitespace-nowrap font-mono text-xs text-ink/60 sm:text-sm">
              ±{record.prediction.ciHalfWidthS.toFixed(2)} s · 90% CI [{record.prediction.p05S.toFixed(2)}–{record.prediction.p95S.toFixed(2)}]
            </p>
          )}
        </div>

        {record && <ResultCard record={record} onNext={onNext} onRerun={onRerun} />}
        {error && (
          <div className="mx-auto mt-4 w-full max-w-lg rounded-2xl border border-wrapper-red/40 bg-white p-4">
            <p className="font-display text-lg font-bold text-wrapper-red">The pipeline fell into the chai.</p>
            <p className="text-sm text-ink/70">{error}</p>
            <button className="btn-secondary mt-3" onClick={onRerun}>Try again</button>
          </div>
        )}
      </div>

      {/* Divider (desktop) */}
      <motion.div
        aria-hidden
        className="absolute inset-y-6 left-1/2 z-10 hidden w-0.75 -translate-x-1/2 rounded-full bg-wrapper-red lg:block"
        style={{ transformOrigin: "top" }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.6, ease: [0.7, 0, 0.2, 1] }}
      />

      {/* Console: slides in on desktop, bottom sheet on mobile */}
      <motion.div
        className="hidden min-h-0 p-4 lg:flex lg:h-[calc(100dvh-4.5rem)] lg:flex-col lg:pl-8"
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <BackendConsole stages={stages} error={error} done={done} className="flex-1" />
      </motion.div>

      <motion.div
        className="fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-3xl bg-console shadow-[0_-10px_30px_rgb(0_0_0/0.25)] lg:hidden"
        initial={{ y: "100%" }}
        animate={{ y: 0, height: sheetH }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      >
        <button
          className="flex items-center justify-between px-5 pb-1 pt-2 font-mono text-xs text-[#c8b48f]"
          onClick={() => setSheet((s) => (s === "peek" ? "half" : s === "half" ? "full" : "peek"))}
          aria-label="Resize backend console"
        >
          <span className="mx-auto mb-1 block h-1.5 w-12 rounded-full bg-white/25" />
        </button>
        <div className="-mt-1 flex items-center justify-between px-5 pb-2 font-mono text-xs text-[#c8b48f]">
          <span>Backend Console {done ? "· done" : "· live"}</span>
          <span className="flex gap-3">
            <button onClick={() => setSheet("peek")} className={sheet === "peek" ? "text-wrapper-yellow" : ""}>min</button>
            <button onClick={() => setSheet("half")} className={sheet === "half" ? "text-wrapper-yellow" : ""}>half</button>
            <button onClick={() => setSheet("full")} className={sheet === "full" ? "text-wrapper-yellow" : ""}>full</button>
          </span>
        </div>
        <BackendConsole stages={stages} error={error} done={done} className="min-h-0 flex-1 rounded-none" />
      </motion.div>
    </section>
  );
}

function BigNumber({ value, final }: { value: number | null; final: boolean }) {
  const [shown, setShown] = useState<string>("?.??");
  const cur = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (value == null) {
      if (reduce) return;
      const id = setInterval(() => setShown((Math.random() * 9 + 0.5).toFixed(2)), 90);
      return () => clearInterval(id);
    }
    const ctl = animate(cur.current, value, {
      duration: reduce ? 0 : 0.9,
      ease: "easeOut",
      onUpdate: (v) => {
        cur.current = v;
        setShown(v.toFixed(2));
      },
    });
    return () => ctl.stop();
  }, [value, reduce]);

  return (
    <p className={`whitespace-nowrap font-display text-8xl font-extrabold tabular-nums leading-none ${final ? "text-wrapper-red" : "text-ink/80"}`} aria-live="polite">
      {shown}
      <span className="text-[0.5em]">s</span>
    </p>
  );
}

function ResultCard({ record, onNext, onRerun }: { record: DunkRecord; onNext: () => void; onRerun: () => void }) {
  const p = record.prediction;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="mx-auto mt-4 w-full max-w-lg rounded-3xl border border-ink/10 bg-white p-5 shadow-sm"
    >
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-widest text-chai">Cause of death forecast</dt>
          <dd className="text-balance font-display text-xl font-bold leading-snug">{p.causeOfDeath}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-widest text-chai">Optimal dunk</dt>
          <dd className="text-balance font-display text-xl font-bold leading-snug">Abhi daal, abhi nikaal: {p.optimalS.toFixed(1)} s</dd>
        </div>
        <div className="rounded-xl bg-cream px-3 py-2 italic text-ink/80">“{p.oneLiner}”</div>
        <p className="text-xs text-ink/55">
          {p.learnedFrom > 0 ? `Corrected by ×${p.correctionFactor.toFixed(3)}, learned from ${p.learnedFrom} real dunk${p.learnedFrom === 1 ? "" : "s"}.` : "No community data for this chai yet. Your dunk will teach the model."}
          {record.visionSource === "fallback" && " Vision ran in offline mode."}
        </p>
      </dl>
      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-wrapper-yellow/20 p-3">
        <span className="text-2xl leading-none" aria-hidden>⏱️</span>
        <p className="text-sm leading-snug text-ink/80">
          <b className="font-display text-base">Now test it for real.</b> Grab your biscuit and chai. The next screen has a stopwatch: start it as you dunk, and tap the moment it falls.
        </p>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="btn-primary flex-1" onClick={onNext}>Start the real dunk →</button>
        <button className="btn-secondary" onClick={onRerun} aria-label="Re-run prediction">↻</button>
      </div>
    </motion.div>
  );
}
