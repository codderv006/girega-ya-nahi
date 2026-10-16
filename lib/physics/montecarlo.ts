import { runModel, type PhysParams } from "./model";
import { gaussian, mulberry32 } from "./rng";

export interface MonteCarloResult {
  n: number;
  median: number;
  mean: number;
  p05: number;
  p95: number;
  histogram: { binStart: number; binEnd: number; count: number }[];
  samplesMs: number;
}

/** Relative 1σ uncertainty on each parameter we pretend not to know exactly. */
export const UNCERTAINTY = {
  poreRadius: 0.15, // lognormal
  tempC: 2.5, // absolute °C
  dryStrength: 0.12,
  tortuosity: 0.08,
  dunkDepth: 0.06,
  thickness: 0.05,
};

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function monteCarlo(base: PhysParams, n: number, seed: number, bins = 24): MonteCarloResult {
  const t0 = performance.now();
  const rng = mulberry32(seed);
  const spiralNoise = base.style === "spiral" ? 2 : 1;
  const out: number[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const m = base.material;
    const p: PhysParams = {
      ...base,
      tempEffC: base.tempEffC + gaussian(rng) * UNCERTAINTY.tempC,
      dunkDepth: Math.min(0.95, Math.max(0.05, base.dunkDepth * (1 + gaussian(rng) * UNCERTAINTY.dunkDepth * spiralNoise))),
      material: {
        ...m,
        poreRadiusM: m.poreRadiusM * Math.exp(gaussian(rng) * UNCERTAINTY.poreRadius * spiralNoise),
        dryStrengthPa: m.dryStrengthPa * (1 + gaussian(rng) * UNCERTAINTY.dryStrength),
        tortuosity: m.tortuosity * (1 + gaussian(rng) * UNCERTAINTY.tortuosity),
        geometry: { ...m.geometry, thicknessM: m.geometry.thicknessM * (1 + gaussian(rng) * UNCERTAINTY.thickness) },
      },
    };
    out[i] = runModel(p).timeToFailureS;
  }

  const sorted = out.filter(Number.isFinite).sort((a, b) => a - b);
  const p05 = quantile(sorted, 0.05);
  const p95 = quantile(sorted, 0.95);
  const lo = quantile(sorted, 0.005);
  const hi = quantile(sorted, 0.995);
  const width = (hi - lo) / bins || 1;
  const histogram = Array.from({ length: bins }, (_, b) => ({ binStart: lo + b * width, binEnd: lo + (b + 1) * width, count: 0 }));
  for (const v of sorted) {
    const b = Math.floor((v - lo) / width);
    if (b >= 0 && b < bins) histogram[b].count++;
  }

  return {
    n: sorted.length,
    median: quantile(sorted, 0.5),
    mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    p05,
    p95,
    histogram,
    samplesMs: performance.now() - t0,
  };
}
