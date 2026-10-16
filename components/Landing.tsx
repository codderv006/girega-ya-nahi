"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { APP_NAME, TAGLINE } from "@/lib/config";
import { LazyScene } from "./three/LazyScene";
import { defaultSceneState, type SceneState } from "./three/types";
import { SiteFooter, SiteHeader } from "./SiteHeader";
import { SmoothScroll } from "./SmoothScroll";

const seg = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));

const STORY = [
  { kicker: "T + 0.0 s", title: "Contact.", body: "The biscuit meets the chai. Somewhere inside it, a capillary begins to fill." },
  { kicker: "Washburn, 1921", title: "L(t) = √(γ·r·cosθ·t / 2η)", body: "Chai races up the pores. Starch softens. The dry core is surrounded.", mono: true },
  { kicker: "T + 3.2 s", title: "Abhi nikaal.", body: "Pull it out. It looks fine. It is not fine. The wet half is holding on by starch alone." },
  { kicker: "T + 3.4 s", title: "Gir gaya.", body: "Structural collapse at 78% saturation. Splash damage: considerable.", red: true },
];

const STAGES = [
  ["Intake", "Zod-validated, SHA-256 hashed, routed to Mumbai because chai."],
  ["Vision", "Gemini inspects your biscuit for cracks, chips and attitude."],
  ["Material", "Pore radius, porosity and tortuosity of your specific biscuit."],
  ["Fluid", "Viscosity, surface tension and contact angle of your chai."],
  ["Washburn", "Capillary penetration: L(t) = √(γ·r·cosθ·t / 2η)."],
  ["Thermal", "Newton cooling per vessel + Arrhenius starch softening."],
  ["Structural", "Wet cantilever bending vs. collapsing strength."],
  ["Monte Carlo", "5,000 parallel-universe biscuits. 90% CI."],
  ["Bayesian", "Learns from every real dunk, per chai type."],
  ["Verdict", "Time of death, cause of death, optimal dunk."],
];

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { amount: 0.5 },
  transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as const },
};

export function Landing() {
  const story = useRef<HTMLDivElement>(null);
  const scene = useRef<SceneState>(defaultSceneState({ heat: 0.75 }));
  const { scrollYProgress } = useScroll({ target: story, offset: ["start start", "end end"] });

  // Six blocks (hero, 4 story beats, outro); block i is centred at progress ≈ i/5.
  // Dunk → soak → pull it up → wet half drops back in with a splash.
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const s = scene.current;
    s.dip = seg(v, 0.04, 0.2);
    s.wet = seg(v, 0.2, 0.45);
    s.lift = seg(v, 0.46, 0.6);
    s.fall = seg(v, 0.68, 0.8);
    s.spin = v < 0.03;
    s.tremble = v > 0.55 && v < 0.7;
    s.snappy = true;
  });

  return (
    <main>
      <SmoothScroll />
      <SiteHeader />

      <div ref={story} className="relative mx-auto grid max-w-6xl px-4 sm:px-8 md:grid-cols-2 md:gap-12">
        {/* 3D: pinned on top (phone) or on the right (tablet/desktop) */}
        <div className="sticky top-0 z-10 -mx-4 h-[42svh] self-start bg-cream sm:-mx-8 md:order-2 md:mx-0 md:h-dvh">
          <LazyScene state={scene} dunkDepth={0.42} className="absolute inset-0" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-cream md:hidden" />
        </div>

        {/* Text: normal flow, one block per screen */}
        <div className="@container min-w-0 md:order-1">
          <section className="flex min-h-[58svh] flex-col justify-center py-10 md:min-h-[calc(100dvh-72px)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wrapper-red">Biscuit ki zindagi, seconds mein</p>
            <h1 className="mt-3 font-display text-[clamp(2.1rem,11cqi,4.5rem)] font-extrabold leading-[0.98] tracking-tight text-balance">
              How long will your Parle-G survive?
            </h1>
            <p className="mt-4 max-w-md text-lg text-ink/60">{TAGLINE}</p>
            <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
              <Link href="/dunk" className="btn-primary">Start the Dunk Analysis</Link>
              <span className="text-sm text-ink/45">or scroll to watch one fall ↓</span>
            </div>
          </section>

          {STORY.map((b) => (
            <section key={b.title} className="flex min-h-[70svh] flex-col justify-center py-10 md:min-h-dvh">
              <motion.div {...reveal}>
                <p className="font-mono text-xs uppercase tracking-widest text-chai">{b.kicker}</p>
                <h2
                  className={`mt-3 font-extrabold leading-tight ${b.mono ? "font-mono text-[clamp(0.95rem,5.2cqi,2rem)] whitespace-nowrap" : "font-display text-[clamp(2.2rem,13cqi,4.5rem)] whitespace-nowrap"} ${b.red ? "text-wrapper-red" : ""}`}
                >
                  {b.title}
                </h2>
                <p className="mt-3 max-w-sm text-lg text-ink/60">{b.body}</p>
              </motion.div>
            </section>
          ))}

          <section className="flex min-h-[70svh] flex-col justify-center py-10 md:min-h-dvh">
            <motion.div {...reveal}>
              <h2 className="font-display text-[clamp(1.6rem,8.6cqi,4rem)] font-extrabold leading-tight whitespace-nowrap">Har dunk ka hisaab.</h2>
              <p className="mt-3 max-w-sm text-lg text-ink/60">Now let&apos;s predict yours, to the decimal second.</p>
              <Link href="/dunk" className="btn-primary mt-7">Start the Dunk Analysis</Link>
            </motion.div>
          </section>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wrapper-red">How it works</p>
        <h2 className="mt-2 max-w-2xl font-display text-4xl font-extrabold leading-tight text-balance">A 10-stage physics pipeline. For a biscuit.</h2>
        <p className="mt-3 max-w-2xl text-ink/60">
          Every prediction streams live from the server, stage by stage, with its real formulas and numbers. Washburn never accounted for kadak chai. We did.
        </p>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-5">
          {STAGES.map(([t, d], i) => (
            <li key={t} className="bg-white p-5">
              <span className="font-mono text-xs text-wrapper-red">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-1 font-display text-lg font-bold">{t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/60">{d}</p>
            </li>
          ))}
        </ol>

        <div className="mt-16 grid min-w-0 gap-6 rounded-3xl bg-ink p-5 text-white sm:gap-8 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-12">
          <div>
            <p className="font-display text-2xl font-bold text-wrapper-yellow">Built on serious science, used unseriously.</p>
            <p className="mt-3 max-w-2xl leading-relaxed text-white/70">
              The Washburn equation (1921) describes capillary flow in porous materials. In 1999, physicist Len Fisher won an Ig Nobel Prize for using it to work out how to dunk a
              biscuit. His research was on British biscuits in British tea. {APP_NAME} extends it to the Indian glucose biscuit, six varieties of chai, four vessels and the human wrist.
            </p>
          </div>
          <Link href="/dunk" className="btn-primary w-full shrink-0 sm:w-fit">Predict my biscuit&apos;s fate</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
