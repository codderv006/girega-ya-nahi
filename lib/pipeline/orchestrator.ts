import { createHash, randomBytes } from "node:crypto";
import { labelOf, CHAI_TYPES, DUNK_STYLES, VESSELS } from "../config";
import { PredictRequest } from "../schemas";
import { CHAI_FLUID } from "../physics/fluid";
import { deriveMaterial, K0, runModel, type PhysParams } from "../physics/model";
import { monteCarlo } from "../physics/montecarlo";
import { posterior, PRIOR_SD, OBS_SD } from "../physics/bayes";
import { STYLE_MECHANICS, sectionModulus } from "../physics/structural";
import { effectiveTemp, newtonCooling, VESSEL_THERMAL } from "../physics/thermal";
import { penetrationDepth } from "../physics/washburn";
import { analyzeImages, withArticle, type VisionOutcome } from "../vision/gemini";
import { getStore } from "../store";
import type { DunkRecord, PipelineEvent, Prediction, StageEvent } from "../types";
import { mulberry32, seedFromString } from "../physics/rng";

export const MC_SAMPLES = 5000;

/** Raised when vision is confident the photo isn't a biscuit; the client asks for a retake. */
export class NotABiscuitError extends Error {
  readonly code = "not-biscuit" as const;
}

/** Only a real Gemini "no" counts; offline heuristics never block a dunk. */
function isBiscuit(v: VisionOutcome): boolean {
  if (v.source !== "gemini") return true;
  return v.result.biscuit.isBiscuit ?? v.result.biscuit.isGlucoseBiscuit;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const r3 = (n: number) => Number(n.toPrecision(4));
const sci = (n: number) => Number(n.toExponential(3));

type Emit = (e: PipelineEvent) => void;

/**
 * Runs the 10-stage dunk pipeline. Every stage does its real computation and
 * reports its actual inputs/outputs; the only theatre is a short pause so a
 * human can read the console.
 */
export async function runPipeline(body: unknown, emit: Emit, opts: { pace?: boolean } = {}): Promise<DunkRecord> {
  const pace = opts.pace ?? true;
  let paceRng = mulberry32(1);

  async function stage<T>(
    index: number,
    id: string,
    name: string,
    fn: () => Promise<Omit<StageEvent, "index" | "id" | "name" | "ms"> & { value: T }> | (Omit<StageEvent, "index" | "id" | "name" | "ms"> & { value: T }),
  ): Promise<T> {
    emit({ type: "stage-start", index, id, name });
    const t0 = performance.now();
    const { value, ...rest } = await fn();
    const ms = performance.now() - t0;
    if (pace) {
      const target = 200 + paceRng() * 500; // 200–700 ms so the console is watchable
      if (ms < target) await sleep(target - ms);
    }
    emit({ type: "stage-done", stage: { index, id, name, ms: r3(ms), ...rest } });
    return value;
  }

  // 1 ────────────────────────────────────────────────────────────────
  const intake = await stage(1, "intake", "Request Intake & Validation", () => {
    const req = PredictRequest.parse(body);
    const dunkId = randomBytes(6).toString("base64url");
    const hash = createHash("sha256");
    hash.update(JSON.stringify({ c: req.chaiType, v: req.vessel, t: req.tempC, d: req.dunkDepth, s: req.style }));
    if (req.biscuitImage) hash.update(req.biscuitImage.data);
    if (req.chaiImage) hash.update(req.chaiImage.data);
    const imageHash = hash.digest("hex");
    const bytes = JSON.stringify(body).length;
    paceRng = mulberry32(seedFromString(imageHash));
    return {
      value: { req, dunkId, imageHash },
      formula: "zod.parse(payload) → SHA-256(params ‖ images)",
      inputs: {
        chaiType: req.chaiType,
        vessel: req.vessel,
        tempC: req.tempC,
        dunkDepth: req.dunkDepth,
        style: req.style,
        biscuitImage: req.biscuitImage ? `${Math.round((req.biscuitImage.data.length * 3) / 4 / 1024)} KB` : "none",
        chaiImage: req.chaiImage ? `${Math.round((req.chaiImage.data.length * 3) / 4 / 1024)} KB` : "none",
      },
      output: { dunkId, sha256: imageHash, payloadBytes: bytes, schema: "valid" },
      logs: [
        "Region: ap-south-1 (Mumbai) because chai.",
        `Assigned dunkId ${dunkId}`,
        `Seed derived from hash: 0x${seedFromString(imageHash).toString(16)}`,
      ],
    };
  });
  const { req, dunkId, imageHash } = intake;
  const seed = seedFromString(imageHash);

  // 2 ────────────────────────────────────────────────────────────────
  const vision = await stage(2, "vision", "Vision Analysis (Gemini)", async () => {
    // The biscuit was already inspected at scan time; only call Gemini again for a chai photo.
    const cached = req.biscuitImage ? req.biscuitVision : undefined;
    let v: VisionOutcome;
    if (cached && !req.chaiImage) {
      v = {
        source: cached.source,
        model: cached.model,
        result: { biscuit: cached.biscuit, chai: null },
        error: cached.source === "fallback" ? "vision lab was busy at scan time" : undefined,
      };
    } else {
      v = await analyzeImages(req.biscuitImage, req.chaiImage, imageHash);
      if (cached?.source === "gemini") v = { ...v, result: { ...v.result, biscuit: cached.biscuit } };
    }
    const logs: string[] = [];
    if (cached) logs.push("Reusing the scan-time biscuit inspection (one Gemini call per dunk).");
    if (v.source === "gemini") logs.push(`Model: ${v.model ?? "gemini"}`, `“${v.result.biscuit.notes}”`);
    else if (v.source === "standard-issue") logs.push("No photo provided. Using a standard-issue biscuit from the reference vault.");
    else logs.push(`Gemini unavailable (${v.error}). Falling back to deterministic offline heuristics.`);
    if (v.result.chai) logs.push(`Chai: “${v.result.chai.notes}”`);
    if (isBiscuit(v) && !v.result.biscuit.isGlucoseBiscuit) logs.push("⚠ A biscuit, but not a glucose one. Proceeding anyway, under protest.");
    if (!isBiscuit(v)) logs.push(`✗ Not a biscuit: ${v.result.biscuit.subject || "unidentified object"}. Halting.`);
    return {
      value: v,
      formula: "gemini.generateContent([biscuit, chai?], responseSchema) → JSON",
      inputs: { source: v.source, model: v.model ?? "n/a", images: (req.biscuitImage ? 1 : 0) + (req.chaiImage ? 1 : 0) },
      output: v.result as unknown as Record<string, unknown>,
      logs,
    };
  });
  // Hard stop: no predictions for things Gemini says aren't biscuits, whatever the client did.
  if (!isBiscuit(vision)) {
    const what = vision.result.biscuit.subject;
    throw new NotABiscuitError(what && !/biscuit|cookie/i.test(what) ? `That looks like ${withArticle(what)}, not a biscuit.` : "That doesn't look like a biscuit.");
  }
  const obs = vision.result.biscuit;
  const milkiness = vision.result.chai?.milkiness;

  // 3 ────────────────────────────────────────────────────────────────
  const material = await stage(3, "material", "Material Profiling", () => {
    const m = deriveMaterial(obs);
    return {
      value: m,
      formula: "r = r₀(1 + 0.4·defect),  σ_dry = σ₀(1 − 0.06·edges)(1 − 0.25·defect)",
      inputs: { thicknessMm: r3(obs.thicknessMm), brokenEdges: obs.brokenEdges, defectScore: r3(obs.defectScore) },
      output: {
        poreRadius_m: sci(m.poreRadiusM),
        porosity: r3(m.geometry.porosity),
        tortuosity: r3(m.tortuosity),
        dryStrength_Pa: Math.round(m.dryStrengthPa),
        mass_g: r3(m.geometry.massKg * 1000),
        length_mm: r3(m.geometry.lengthM * 1000),
      },
      logs: [
        `Biscuit is ${obs.brokenEdges === 0 ? "structurally intact" : `missing ${obs.brokenEdges} edge(s). Condolences in advance`}.`,
        `Effective pore radius ${(m.poreRadiusM * 1e6).toFixed(3)} µm.`,
      ],
    };
  });

  // 4 ────────────────────────────────────────────────────────────────
  const fluidStage = await stage(4, "fluid", "Fluid Dynamics", () => {
    const tEff = effectiveTemp(req.tempC, req.vessel, CHAI_FLUID[req.chaiType].tempOffsetC);
    const probe = runModel({ chaiType: req.chaiType, milkiness, tempEffC: tEff, material, dunkDepth: req.dunkDepth, style: req.style });
    const f = probe.fluid;
    const spec = CHAI_FLUID[req.chaiType];
    return {
      value: { tEff },
      formula: "η(T) = 2.414e-5 · 10^(247.8 / (T − 140)) · μ_milk,   γ(T) = γ₂₀(1 − 0.0022(T − 20))",
      inputs: {
        chai: labelOf(CHAI_TYPES, req.chaiType),
        tempServed_C: req.tempC,
        tempEffective_C: r3(tEff),
        milkiness: r3(milkiness ?? spec.milkiness),
        milkMultiplier: spec.viscosityMult,
      },
      output: {
        viscosity_Pa_s: sci(f.viscosity),
        surfaceTension_N_m: r3(f.surfaceTension),
        contactAngle_deg: r3((f.contactAngleRad * 180) / Math.PI),
      },
      logs: [
        spec.tempOffsetC < 0 ? `Office machine detected: applying ${spec.tempOffsetC} °C honesty correction.` : `Chai is ${r3(f.viscosity / 2.8e-4)}× as viscous as boiling water.`,
      ],
    };
  });
  const tEff = fluidStage.tEff;
  const base: PhysParams = { chaiType: req.chaiType, milkiness, tempEffC: tEff, material, dunkDepth: req.dunkDepth, style: req.style };
  const det = runModel(base);
  const mech = STYLE_MECHANICS[req.style];

  // 5 ────────────────────────────────────────────────────────────────
  await stage(5, "washburn", "Washburn Capillary Model", () => {
    const f = det.fluid;
    const r = material.poreRadiusM * mech.flowBoost;
    const table: Record<string, string> = {};
    for (const t of [1, 2, 3, 5, 8]) {
      table[`L(${t}s)`] = `${(penetrationDepth(t, f.surfaceTension, r, f.contactAngleRad, f.viscosity) * 1000).toFixed(3)} mm`;
    }
    return {
      value: null,
      formula: "L(t) = √(γ · r · cosθ · t / 2η)   ⇒   t_sat = 2η·L_c² / (γ · r · cosθ)",
      inputs: {
        gamma: r3(f.surfaceTension),
        r_m: sci(r),
        cosTheta: r3(Math.cos(f.contactAngleRad)),
        eta: sci(f.viscosity),
        L_critical_mm: r3(det.criticalDepthM * 1000),
        wickingFaces: mech.sides,
      },
      output: { ...table, t_saturation_s: r3(det.saturationTimeS) },
      logs: [
        mech.sides === 1 ? "Single-face wicking (Fisher configuration). Dry top layer standing guard." : "Two-face wicking. The core is surrounded.",
        mech.flowBoost > 1 ? `Spiral agitation: forced convection boosts effective r by ${Math.round((mech.flowBoost - 1) * 100)}%.` : "Quiescent capillary flow.",
      ],
    };
  });

  // 6 ────────────────────────────────────────────────────────────────
  await stage(6, "thermal", "Thermal Softening Model", () => {
    const v = VESSEL_THERMAL[req.vessel];
    const curve: Record<string, string> = {};
    for (const t of [0, 5, 10, 30]) curve[`T(${t}s)`] = `${newtonCooling(req.tempC - v.pourLossC, t, v.tauS).toFixed(2)} °C`;
    return {
      value: null,
      formula: "T(t) = T∞ + (T₀ − T∞)e^(−t/τ),   S = exp[(Eₐ/R)(1/T_ref − 1/T)],   k = k₀√S",
      inputs: { vessel: labelOf(VESSELS, req.vessel), pourLoss_C: v.pourLossC, tau_s: v.tauS, Ea_J_mol: 25000, k0: K0 },
      output: { ...curve, softeningFactor: r3(det.softening), k_effective: r3(det.k) },
      logs: [
        req.vessel === "kulhad" ? "Kulhad absorbs heat and adds earthy notes. Notes are not modelled." : req.vessel === "steel" ? "Steel glass: holding heat like a grudge." : "Vessel thermal mass within nominal range.",
        `Starch softening is ${r3(det.softening)}× the 60 °C reference rate.`,
      ],
    };
  });

  // 7 ────────────────────────────────────────────────────────────────
  await stage(7, "structural", "Structural Failure Model", () => {
    const g = material.geometry;
    return {
      value: null,
      formula: "σ_bend = M/Z, M = ½wL²·arm·DAF,  Z = bh²/6,   σ_wet(s) = σ_dry[(1−s)² + e^(−ks)]/2   → solve σ_wet = σ_bend",
      inputs: {
        style: labelOf(DUNK_STYLES, req.style),
        wetLength_mm: r3(g.lengthM * req.dunkDepth * 1000),
        sectionModulus_m3: sci(sectionModulus(g.widthM, g.thicknessM)),
        momentArm: mech.momentArm,
        wristDynamicFactor: mech.dynamicFactor,
        support: mech.supportFactor,
      },
      output: {
        failureSaturation: r3(det.failureSaturation),
        stressAtFailure_Pa: Math.round(det.stressAtFailurePa),
        strengthAtFailure_Pa: Math.round(det.strengthAtFailurePa),
        deterministicTTF_s: r3(det.timeToFailureS),
      },
      logs: [
        det.survivesSaturation
          ? "Biscuit survives full saturation. Entering sugar-dissolution phase."
          : `Bisection converged: collapse at ${(det.failureSaturation * 100).toFixed(1)}% saturation.`,
      ],
    };
  });

  // 8 ────────────────────────────────────────────────────────────────
  const mc = await stage(8, "montecarlo", "Monte Carlo Ensemble", () => {
    const res = monteCarlo(base, MC_SAMPLES, seed);
    return {
      value: res,
      formula: `${MC_SAMPLES.toLocaleString()} × runModel(θ + ε),  ε ~ N(0, Σ)`,
      inputs: { samples: MC_SAMPLES, seed: `0x${seed.toString(16)}`, perturbed: "r, T, σ_dry, τ, depth, h" },
      output: { median_s: r3(res.median), mean_s: r3(res.mean), p05_s: r3(res.p05), p95_s: r3(res.p95), computeMs: r3(res.samplesMs) },
      histogram: res.histogram.map((h) => ({ binStart: r3(h.binStart), binEnd: r3(h.binEnd), count: h.count })),
      logs: [`Simulated ${res.n.toLocaleString()} parallel-universe biscuits. All of them died.`],
    };
  });

  // 9 ────────────────────────────────────────────────────────────────
  const store = getStore();
  const bayes = await stage(9, "bayes", "Bayesian Community Correction", async () => {
    let stats = { n: 0, sumLogRatio: 0 };
    try {
      stats = await store.getChaiStats(req.chaiType);
    } catch {
      /* store hiccup: use the prior */
    }
    const post = posterior(stats);
    return {
      value: post,
      formula: "log c | data ~ N( (Σy/σ²) / (1/σ₀² + n/σ²),  1/(1/σ₀² + n/σ²) ),  y = log(actual/predicted)",
      inputs: { chaiType: req.chaiType, observations: stats.n, priorSd: PRIOR_SD, obsSd: OBS_SD, store: store.kind },
      output: { posteriorMean: r3(post.mean), posteriorSd: r3(post.sd), correctionFactor: r3(post.factor) },
      logs: [
        stats.n === 0
          ? `Learned from 0 real dunks of ${labelOf(CHAI_TYPES, req.chaiType)}. You could be the first.`
          : `Learned from ${stats.n} real dunk${stats.n === 1 ? "" : "s"}. Community says ×${post.factor.toFixed(3)}.`,
      ],
    };
  });

  // 10 ───────────────────────────────────────────────────────────────
  const record = await stage(10, "verdict", "Verdict Synthesis", async () => {
    const c = bayes.factor;
    const median = mc.median * c;
    const p05 = mc.p05 * c;
    const p95 = mc.p95 * c;
    const prediction: Prediction = {
      medianS: round2(median),
      p05S: round2(p05),
      p95S: round2(p95),
      ciHalfWidthS: round2((p95 - p05) / 2),
      optimalS: round2(Math.max(0.5, p05 * 0.85)),
      failureSaturation: r3(det.failureSaturation),
      causeOfDeath: causeOfDeath(req.style, det.failureSaturation, det.survivesSaturation),
      oneLiner: oneLiner(median, req.style),
      learnedFrom: bayes.n,
      correctionFactor: r3(c),
    };
    const rec: DunkRecord = {
      id: dunkId,
      createdAt: Date.now(),
      inputs: { chaiType: req.chaiType, vessel: req.vessel, tempC: req.tempC, dunkDepth: req.dunkDepth, style: req.style },
      prediction,
      visionSource: vision.source,
    };
    try {
      await store.saveDunk(rec);
    } catch {
      /* non-fatal */
    }
    return {
      value: rec,
      formula: "t* = median(MC) · c,   CI₉₀ = [p₀₅, p₉₅] · c,   t_optimal = 0.85 · p₀₅",
      inputs: { mcMedian_s: r3(mc.median), correction: r3(c) },
      output: {
        predicted_s: prediction.medianS,
        ci90: `${prediction.p05S}–${prediction.p95S} s`,
        optimalDunk_s: prediction.optimalS,
        causeOfDeath: prediction.causeOfDeath,
      },
      logs: [prediction.oneLiner, `Persisted to ${store.kind} store.`],
    };
  });

  emit({ type: "result", record });
  return record;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function causeOfDeath(style: string, s: number, survived: boolean): string {
  const pct = Math.round(s * 100);
  if (survived) return "Sugar-matrix dissolution after full saturation";
  if (style === "spiral") return `Centrifugal disintegration at ${pct}% saturation`;
  if (style === "horizontal") return `Dignified delamination at ${pct}% saturation`;
  return `Structural collapse at ${pct}% saturation`;
}

function oneLiner(t: number, style: string): string {
  if (style === "horizontal" && t > 10) return "Len Fisher would be proud. The biscuit, less so.";
  if (t < 1.5) return "Blink and it's chai sludge.";
  if (t < 3) return "Short life. Glorious dunk.";
  if (t < 6) return "A respectable career in the cup.";
  if (t < 12) return "This biscuit has seen things.";
  return "Practically immortal. Suspiciously so.";
}
