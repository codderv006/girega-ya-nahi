import type { ChaiTypeId, DunkStyleId } from "../config";
import { STANDARD_BISCUIT } from "./constants";
import { chaiFluid, type FluidProps } from "./fluid";
import { failureSaturation, STYLE_MECHANICS, wetStrength, bendingStress, type Geometry } from "./structural";
import { softeningFactor } from "./thermal";
import { timeToDepth } from "./washburn";

/** Base wet-shell softening rate before thermal amplification. */
export const K0 = 7;

export interface BiscuitObservation {
  thicknessMm: number;
  brokenEdges: number;
  defectScore: number; // 0..1
}

export interface Material {
  geometry: Geometry;
  poreRadiusM: number;
  tortuosity: number;
  dryStrengthPa: number;
}

/** Derive material parameters from what vision (or the default) saw. */
export function deriveMaterial(obs: BiscuitObservation): Material {
  const defect = Math.min(1, Math.max(0, obs.defectScore));
  const edges = Math.min(4, Math.max(0, Math.round(obs.brokenEdges)));
  const thicknessM = Math.min(8, Math.max(3, obs.thicknessMm)) / 1000;
  const thickRatio = thicknessM / STANDARD_BISCUIT.thicknessM;
  return {
    geometry: {
      lengthM: STANDARD_BISCUIT.lengthM * (1 - 0.05 * edges),
      widthM: STANDARD_BISCUIT.widthM,
      thicknessM,
      massKg: STANDARD_BISCUIT.massKg * thickRatio * (1 - 0.05 * edges),
      porosity: Math.min(0.6, STANDARD_BISCUIT.porosity + 0.03 * defect),
    },
    // Cracks open wider capillary channels.
    poreRadiusM: STANDARD_BISCUIT.poreRadiusM * (1 + 0.4 * defect),
    tortuosity: STANDARD_BISCUIT.tortuosity * (1 - 0.1 * defect),
    dryStrengthPa: STANDARD_BISCUIT.dryStrengthPa * (1 - 0.06 * edges) * (1 - 0.25 * defect),
  };
}

export interface PhysParams {
  chaiType: ChaiTypeId;
  milkiness?: number;
  tempEffC: number;
  material: Material;
  dunkDepth: number; // fraction of biscuit length submerged
  style: DunkStyleId;
}

export interface ModelResult {
  fluid: FluidProps;
  criticalDepthM: number;
  saturationTimeS: number;
  softening: number;
  k: number;
  failureSaturation: number;
  survivesSaturation: boolean;
  stressAtFailurePa: number;
  strengthAtFailurePa: number;
  timeToFailureS: number;
}

export function runModel(p: PhysParams): ModelResult {
  const mech = STYLE_MECHANICS[p.style];
  const fluid = chaiFluid(p.chaiType, p.tempEffC, p.milkiness);
  const m = p.material;

  // Wet front must cross the (tortuous) half thickness, or full thickness if one-sided.
  const criticalDepthM = (m.tortuosity * m.geometry.thicknessM) / mech.sides;
  const saturationTimeS = timeToDepth(
    criticalDepthM,
    fluid.surfaceTension,
    m.poreRadiusM * mech.flowBoost,
    fluid.contactAngleRad,
    fluid.viscosity,
  );

  const softening = softeningFactor(p.tempEffC);
  const k = K0 * Math.sqrt(softening);
  const fail = failureSaturation(m.geometry, m.dryStrengthPa, k, p.dunkDepth, p.style);

  let timeToFailureS: number;
  if (fail.survivesSaturation) {
    // Fully soaked but standing: the slow sugar-dissolution phase finishes it off.
    const ratio = wetStrength(m.dryStrengthPa, 1, k) / bendingStress(m.geometry, p.dunkDepth, 1, p.style);
    timeToFailureS = saturationTimeS * (1 + Math.min(3, Math.log(ratio)));
  } else {
    // Washburn: s = L/L_crit = sqrt(t / t_sat)  =>  t = t_sat · s²
    timeToFailureS = saturationTimeS * fail.saturation ** 2;
  }

  return {
    fluid,
    criticalDepthM,
    saturationTimeS,
    softening,
    k,
    failureSaturation: fail.saturation,
    survivesSaturation: fail.survivesSaturation,
    stressAtFailurePa: bendingStress(m.geometry, p.dunkDepth, fail.saturation, p.style),
    strengthAtFailurePa: wetStrength(m.dryStrengthPa, fail.saturation, k),
    timeToFailureS,
  };
}
