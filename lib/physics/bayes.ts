/**
 * Per-chai-type multiplicative correction, learned in log space with a
 * conjugate Normal–Normal model:
 *   prior     log c ~ N(μ0, σ0²)
 *   each obs  y_i = log(actual / predicted) ~ N(log c, σ²)
 *   posterior precision = 1/σ0² + n/σ²
 *   posterior mean      = (μ0/σ0² + Σy/σ²) / precision
 */
export const PRIOR_MEAN = 0;
export const PRIOR_SD = 0.25;
export const OBS_SD = 0.35;

export interface ChaiStats {
  n: number;
  sumLogRatio: number;
}

export interface Posterior {
  n: number;
  mean: number; // in log space
  sd: number;
  factor: number; // exp(mean)
}

export function posterior(stats: ChaiStats, priorMean = PRIOR_MEAN, priorSd = PRIOR_SD, obsSd = OBS_SD): Posterior {
  const precision = 1 / priorSd ** 2 + stats.n / obsSd ** 2;
  const mean = (priorMean / priorSd ** 2 + stats.sumLogRatio / obsSd ** 2) / precision;
  return { n: stats.n, mean, sd: Math.sqrt(1 / precision), factor: Math.exp(mean) };
}

/** Clamp extreme observations so one chaotic dunk can't wreck the model. */
export function observation(predicted: number, actual: number): number {
  const y = Math.log(Math.max(0.1, actual) / Math.max(0.1, predicted));
  return Math.max(-1.5, Math.min(1.5, y));
}

export function addObservation(stats: ChaiStats, predicted: number, actual: number): ChaiStats {
  return { n: stats.n + 1, sumLogRatio: stats.sumLogRatio + observation(predicted, actual) };
}
