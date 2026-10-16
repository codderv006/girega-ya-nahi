import { CHAI_DENSITY, G } from "./constants";
import type { DunkStyleId } from "../config";

export interface Geometry {
  lengthM: number;
  widthM: number;
  thicknessM: number;
  massKg: number;
  porosity: number;
}

/** How each dunk style loads the wet section. */
export const STYLE_MECHANICS: Record<
  DunkStyleId,
  { sides: 1 | 2; momentArm: number; dynamicFactor: number; supportFactor: number; flowBoost: number }
> = {
  // Held at ~60° tilt; wicks from both faces; wrist tremor on extraction.
  vertical: { sides: 2, momentArm: 0.5, dynamicFactor: 18, supportFactor: 1, flowBoost: 1 },
  // Fisher method: lies on the surface, wicks from one face, dry top layer supports it.
  horizontal: { sides: 1, momentArm: 1, dynamicFactor: 6, supportFactor: 0.3, flowBoost: 1 },
  // Swirling adds drag and forced convection into the pores.
  spiral: { sides: 2, momentArm: 0.65, dynamicFactor: 30, supportFactor: 1, flowBoost: 1.25 },
};

/** Section modulus of a rectangular section: Z = b·h²/6. */
export function sectionModulus(b: number, h: number): number {
  return (b * h * h) / 6;
}

/**
 * Bending stress at the waterline from the wet section acting as a cantilever
 * under its own (soggy) weight, amplified by human wrist dynamics.
 */
export function bendingStress(geo: Geometry, dunkDepth: number, saturation: number, style: DunkStyleId): number {
  const m = STYLE_MECHANICS[style];
  const wetLen = geo.lengthM * dunkDepth;
  const dryPerLen = geo.massKg / geo.lengthM;
  const chaiPerLen = geo.porosity * geo.widthM * geo.thicknessM * saturation * CHAI_DENSITY;
  const w = (dryPerLen + chaiPerLen) * G; // N/m
  const M = ((w * wetLen * wetLen) / 2) * m.momentArm * m.dynamicFactor * m.supportFactor;
  return M / sectionModulus(geo.widthM, geo.thicknessM);
}

/**
 * Wet strength of the section: a dry core (whose section modulus scales with
 * the square of its remaining thickness) plus an exponentially softening wet shell.
 *   σ_eff(s) = σ_dry · [ (1 − s)² + e^(−k·s) ] / 2
 */
export function wetStrength(dryStrength: number, saturation: number, k: number): number {
  const s = Math.min(1, Math.max(0, saturation));
  return (dryStrength * ((1 - s) ** 2 + Math.exp(-k * s))) / 2;
}

/**
 * Find the saturation at which strength drops below stress (bisection).
 * Returns saturation 1 if the biscuit survives full saturation.
 */
export function failureSaturation(
  geo: Geometry,
  dryStrength: number,
  k: number,
  dunkDepth: number,
  style: DunkStyleId,
): { saturation: number; iterations: number; survivesSaturation: boolean } {
  const margin = (s: number) => wetStrength(dryStrength, s, k) - bendingStress(geo, dunkDepth, s, style);
  if (margin(1) > 0) return { saturation: 1, iterations: 0, survivesSaturation: true };
  if (margin(0) <= 0) return { saturation: 0, iterations: 0, survivesSaturation: false };
  let lo = 0;
  let hi = 1;
  let i = 0;
  for (; i < 40 && hi - lo > 1e-6; i++) {
    const mid = (lo + hi) / 2;
    if (margin(mid) > 0) lo = mid;
    else hi = mid;
  }
  return { saturation: (lo + hi) / 2, iterations: i, survivesSaturation: false };
}
