import { KELVIN, R_GAS } from "./constants";
import type { VesselId } from "../config";

/** Vessel heat behaviour: instant loss when poured + Newtonian cooling time constant. */
export const VESSEL_THERMAL: Record<VesselId, { pourLossC: number; tauS: number }> = {
  kulhad: { pourLossC: 6, tauS: 240 }, // porous clay soaks heat and evaporates
  steel: { pourLossC: 1, tauS: 900 },
  mug: { pourLossC: 3, tauS: 600 },
  paper: { pourLossC: 2, tauS: 360 },
};

/** Newton's law of cooling, ambient 30 °C (Mumbai). */
export function newtonCooling(t0C: number, tS: number, tauS: number, ambientC = 30): number {
  return ambientC + (t0C - ambientC) * Math.exp(-tS / tauS);
}

/** Effective chai temperature during the dunk (midpoint of a nominal 5 s window). */
export function effectiveTemp(tempC: number, vessel: VesselId, offsetC = 0): number {
  const v = VESSEL_THERMAL[vessel];
  const poured = tempC - v.pourLossC + offsetC;
  return newtonCooling(poured, 2.5, v.tauS);
}

/**
 * Starch gelatinisation / sugar-glass softening as an Arrhenius rate ratio
 * relative to 60 °C, Ea = 25 kJ/mol.
 */
export const SOFTENING_EA = 25_000;
export function softeningFactor(tempC: number, refC = 60): number {
  const T = tempC + KELVIN;
  const Tref = refC + KELVIN;
  return Math.exp((SOFTENING_EA / R_GAS) * (1 / Tref - 1 / T));
}
