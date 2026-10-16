"use client";

import { useEffect, useState } from "react";
import { CHAI_TYPES, DUNK_STYLES, HEAT_MAX_C, HEAT_MIN_C, VESSELS, heatLabel, type ChaiTypeId, type DunkStyleId, type VesselId } from "@/lib/config";
import { prepareImage, type PreparedImage } from "@/lib/client/image";
import { CHAI_FLUID } from "@/lib/physics/fluid";
import { LazyScene } from "../three/LazyScene";
import type { SceneState } from "../three/types";

export interface Setup {
  chaiType: ChaiTypeId;
  vessel: VesselId;
  tempC: number;
  dunkDepth: number;
  style: DunkStyleId;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-6">
      <legend className="font-display text-xl font-bold">{title}</legend>
      {hint && <p className="-mt-0.5 mb-2 text-sm text-ink/60">{hint}</p>}
      {children}
    </fieldset>
  );
}

function MiniBiscuit({ depth }: { depth: number }) {
  const h = 70;
  return (
    <svg viewBox="0 0 60 90" className="h-24 w-16 shrink-0" aria-hidden>
      <rect x="0" y={90 - 26} width="60" height="26" rx="6" fill="#A0642B" opacity="0.35" />
      <g transform={`translate(10 ${90 - 26 - h + depth * h})`}>
        <rect width="40" height={h} rx="5" fill="#E8B86D" stroke="#C98F3E" strokeWidth="3" />
        <rect y={h - depth * h} width="40" height={depth * h} rx="5" fill="#A0642B" opacity="0.55" />
        {[14, 35, 56].map((y) => [10, 20, 30].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="#C98F3E" />))}
      </g>
      <line x1="0" x2="60" y1={64} y2={64} stroke="#2B1B0E" strokeWidth="2" strokeDasharray="4 3" />
    </svg>
  );
}

export function SetupStep({
  setup,
  onChange,
  chaiImage,
  onChaiImage,
  scene,
  onBack,
  onNext,
}: {
  setup: Setup;
  onChange: (s: Setup) => void;
  chaiImage: PreparedImage | null;
  onChaiImage: (i: PreparedImage | null) => void;
  scene: React.RefObject<SceneState>;
  onBack: () => void;
  onNext: () => void;
}) {
  const set = <K extends keyof Setup>(k: K, v: Setup[K]) => onChange({ ...setup, [k]: v });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = scene.current;
    s.heat = (setup.tempC - HEAT_MIN_C) / (HEAT_MAX_C - HEAT_MIN_C);
    s.vessel = setup.vessel;
    s.milkiness = CHAI_FLUID[setup.chaiType].milkiness;
    s.dip = 0;
    s.wet = 0;
    s.fall = 0;
    s.spin = true;
    s.snappy = false;
    s.tremble = false;
  }, [setup, scene]);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-28 sm:px-8">
      <div className="grid items-center gap-2 sm:grid-cols-[1fr_260px]">
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-tight">Configure the chai.</h1>
          <p className="text-balance text-ink/65">Every variable matters. Some of them matter scientifically.</p>
        </div>
        <LazyScene state={scene} dunkDepth={Math.round(setup.dunkDepth * 20) / 20} compact className="h-44 sm:h-56" />
      </div>

      <Section title="Chai type">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
          {CHAI_TYPES.map((c) => (
            <button key={c.id} type="button" className="card-choice" aria-pressed={setup.chaiType === c.id} onClick={() => set("chaiType", c.id)}>
              <span className="one-line font-display text-lg font-bold leading-tight">
                <span aria-hidden>{c.emoji}</span> {c.label}
              </span>
              <span className="one-line text-xs text-ink/60">{c.blurb}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Vessel">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2">
          {VESSELS.map((v) => (
            <button key={v.id} type="button" className="card-choice" aria-pressed={setup.vessel === v.id} onClick={() => set("vessel", v.id)}>
              <span className="one-line font-display text-lg font-bold leading-tight">
                <span aria-hidden>{v.emoji}</span> {v.label}
              </span>
              <span className="one-line text-xs text-ink/60">{v.blurb}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Heat" hint="Watch the steam.">
        <div className="rounded-2xl border border-ink/10 bg-white p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3 whitespace-nowrap">
            <span className="one-line font-display text-2xl font-extrabold">{heatLabel(setup.tempC)}</span>
            <span className="font-mono text-lg tabular-nums">{setup.tempC}°C</span>
          </div>
          <input
            type="range"
            className="chai-range"
            min={HEAT_MIN_C}
            max={HEAT_MAX_C}
            value={setup.tempC}
            onChange={(e) => set("tempC", Number(e.target.value))}
            aria-label="Chai temperature"
          />
          <div className="mt-1 flex justify-between text-xs text-ink/55">
            <span>Lukewarm regret</span>
            <span>Lava</span>
          </div>
        </div>
      </Section>

      <Section title="Dunk depth" hint="How much biscuit goes in.">
        <div className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-white p-4">
          <MiniBiscuit depth={setup.dunkDepth} />
          <div className="flex-1">
            <div className="mb-3 flex items-baseline justify-between gap-3 whitespace-nowrap">
              <span className="font-display text-2xl font-extrabold">{Math.round(setup.dunkDepth * 100)}%</span>
              <span className="text-sm text-ink/60">{setup.dunkDepth < 0.3 ? "Timid" : setup.dunkDepth < 0.55 ? "Balanced" : setup.dunkDepth < 0.75 ? "Bold" : "Reckless"}</span>
            </div>
            <input
              type="range"
              className="chai-range"
              min={0.1}
              max={0.9}
              step={0.05}
              value={setup.dunkDepth}
              onChange={(e) => set("dunkDepth", Number(e.target.value))}
              aria-label="Dunk depth"
            />
          </div>
        </div>
      </Section>

      <Section title="Dunk style">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2">
          {DUNK_STYLES.map((d) => (
            <button key={d.id} type="button" className="card-choice" aria-pressed={setup.style === d.id} onClick={() => set("style", d.id)}>
              <span className="one-line text-[11px] font-semibold uppercase tracking-wider text-wrapper-red">{d.tag}</span>
              <span className="one-line font-display text-lg font-bold leading-tight">
                {d.label}
              </span>
              <span className="one-line text-xs text-ink/60">{d.blurb}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Chai photo" hint="Optional. Lets vision estimate milkiness.">
        {chaiImage ? (
          <div className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={chaiImage.previewUrl} alt="Your chai" className="h-16 w-16 rounded-xl object-cover" />
            <span className="flex-1 text-sm">Chai specimen on file.</span>
            <button className="text-sm font-semibold underline" onClick={() => onChaiImage(null)}>Remove</button>
          </div>
        ) : (
          <label className="btn-secondary w-full cursor-pointer">
            {busy ? "Processing…" : "☕ Add a chai photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                setBusy(true);
                try {
                  onChaiImage(await prepareImage(f));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
        )}
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-cream/90 px-4 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-3xl gap-2">
          <button className="btn-secondary" onClick={onBack} aria-label="Back">←</button>
          <button className="btn-primary flex-1" onClick={onNext}>Predict my biscuit&apos;s fate</button>
        </div>
      </div>
    </section>
  );
}
