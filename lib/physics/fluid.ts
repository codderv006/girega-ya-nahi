import { KELVIN } from "./constants";
import type { ChaiTypeId } from "../config";

/**
 * Per-chai-type fluid modifiers. Milk fat raises viscosity, proteins lower
 * surface tension, and fat films raise the contact angle on starch.
 */
export const CHAI_FLUID: Record<
  ChaiTypeId,
  { viscosityMult: number; gamma20: number; contactAngleDeg: number; milkiness: number; tempOffsetC: number }
> = {
  cutting: { viscosityMult: 1.35, gamma20: 0.052, contactAngleDeg: 62, milkiness: 0.5, tempOffsetC: 0 },
  kadak: { viscosityMult: 1.45, gamma20: 0.05, contactAngleDeg: 58, milkiness: 0.55, tempOffsetC: 0 },
  adrak: { viscosityMult: 1.4, gamma20: 0.051, contactAngleDeg: 60, milkiness: 0.5, tempOffsetC: 0 },
  elaichi: { viscosityMult: 1.38, gamma20: 0.051, contactAngleDeg: 61, milkiness: 0.52, tempOffsetC: 0 },
  doodh: { viscosityMult: 1.75, gamma20: 0.047, contactAngleDeg: 66, milkiness: 0.85, tempOffsetC: 0 },
  // Office machine chai is never as hot as the machine claims.
  office: { viscosityMult: 1.15, gamma20: 0.06, contactAngleDeg: 55, milkiness: 0.3, tempOffsetC: -8 },
};

/**
 * Water viscosity via the Vogel–Fulcher–Tammann form:
 *   η(T) = A · 10^(B / (T − C)),  A = 2.414e-5 Pa·s, B = 247.8 K, C = 140 K
 */
export function waterViscosity(tempC: number): number {
  const T = tempC + KELVIN;
  return 2.414e-5 * Math.pow(10, 247.8 / (T - 140));
}

/** Surface tension, linear in T (about −0.22 %/°C from the 20 °C reference). */
export function surfaceTension(gamma20: number, tempC: number): number {
  return gamma20 * (1 - 0.0022 * (tempC - 20));
}

export interface FluidProps {
  viscosity: number; // Pa·s
  surfaceTension: number; // N/m
  contactAngleRad: number;
}

export function chaiFluid(type: ChaiTypeId, tempC: number, milkinessOverride?: number): FluidProps {
  const f = CHAI_FLUID[type];
  // If vision saw the chai, nudge the milk multiplier towards what it saw.
  const milk = milkinessOverride ?? f.milkiness;
  const milkAdj = 1 + (milk - f.milkiness) * 0.8;
  return {
    viscosity: waterViscosity(tempC) * f.viscosityMult * milkAdj,
    surfaceTension: surfaceTension(f.gamma20, tempC),
    contactAngleRad: (f.contactAngleDeg * Math.PI) / 180,
  };
}
