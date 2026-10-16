import { describe, expect, it } from "vitest";
import { penetrationDepth, timeToDepth } from "@/lib/physics/washburn";
import { waterViscosity } from "@/lib/physics/fluid";
import { deriveMaterial, runModel, type PhysParams } from "@/lib/physics/model";
import { monteCarlo } from "@/lib/physics/montecarlo";
import { addObservation, posterior } from "@/lib/physics/bayes";
import { failureSaturation, wetStrength } from "@/lib/physics/structural";

const base: PhysParams = {
  chaiType: "cutting",
  tempEffC: 80,
  material: deriveMaterial({ thicknessMm: 4.8, brokenEdges: 0, defectScore: 0.1 }),
  dunkDepth: 0.4,
  style: "vertical",
};

describe("Washburn", () => {
  const [g, r, th, eta] = [0.05, 1e-6, Math.PI / 3, 5e-4];
  it("penetration scales with sqrt(t)", () => {
    const L1 = penetrationDepth(1, g, r, th, eta);
    const L4 = penetrationDepth(4, g, r, th, eta);
    expect(L4 / L1).toBeCloseTo(2, 10);
  });
  it("timeToDepth inverts penetrationDepth", () => {
    const L = penetrationDepth(3.7, g, r, th, eta);
    expect(timeToDepth(L, g, r, th, eta)).toBeCloseTo(3.7, 10);
  });
  it("is Infinity when the liquid does not wet (θ ≥ 90°)", () => {
    expect(timeToDepth(0.001, g, r, Math.PI / 2 + 0.01, eta)).toBe(Infinity);
  });
});

describe("Fluid", () => {
  it("water viscosity is about 1.0 mPa·s at 20 °C and 0.28 at 100 °C", () => {
    expect(waterViscosity(20)).toBeCloseTo(1.0e-3, 4);
    expect(waterViscosity(100)).toBeCloseTo(0.28e-3, 4);
  });
});

describe("Structural model", () => {
  it("strength decreases monotonically with saturation", () => {
    let prev = Infinity;
    for (let s = 0; s <= 1; s += 0.05) {
      const v = wetStrength(1e6, s, 8);
      expect(v).toBeLessThan(prev);
      prev = v;
    }
  });
  it("deeper dunks fail at lower saturation", () => {
    const geo = base.material.geometry;
    const shallow = failureSaturation(geo, 9e5, 8, 0.2, "vertical").saturation;
    const deep = failureSaturation(geo, 9e5, 8, 0.7, "vertical").saturation;
    expect(deep).toBeLessThan(shallow);
  });
});

describe("Full model", () => {
  it("predicts a few seconds for a standard vertical cutting-chai dunk", () => {
    const t = runModel(base).timeToFailureS;
    expect(t).toBeGreaterThan(1);
    expect(t).toBeLessThan(10);
  });
  it("Fisher's horizontal method survives several times longer", () => {
    const v = runModel(base).timeToFailureS;
    const h = runModel({ ...base, style: "horizontal" }).timeToFailureS;
    expect(h / v).toBeGreaterThan(3);
  });
  it("hotter chai kills faster", () => {
    expect(runModel({ ...base, tempEffC: 92 }).timeToFailureS).toBeLessThan(runModel({ ...base, tempEffC: 55 }).timeToFailureS);
  });
});

describe("Monte Carlo", () => {
  it("is deterministic for a given seed", () => {
    const a = monteCarlo(base, 2000, 42);
    const b = monteCarlo(base, 2000, 42);
    expect(a.median).toBe(b.median);
    expect(a.histogram).toEqual(b.histogram);
  });
  it("differs for a different seed and brackets the median", () => {
    const a = monteCarlo(base, 2000, 42);
    const c = monteCarlo(base, 2000, 7);
    expect(a.median).not.toBe(c.median);
    expect(a.p05).toBeLessThan(a.median);
    expect(a.p95).toBeGreaterThan(a.median);
    expect(a.histogram.reduce((s, h) => s + h.count, 0)).toBeGreaterThan(1900);
  });
});

describe("Bayesian correction", () => {
  it("returns the prior with no data", () => {
    const p = posterior({ n: 0, sumLogRatio: 0 });
    expect(p.factor).toBe(1);
    expect(p.sd).toBeCloseTo(0.25);
  });
  it("moves toward observations and shrinks uncertainty", () => {
    let s = { n: 0, sumLogRatio: 0 };
    for (let i = 0; i < 20; i++) s = addObservation(s, 4, 6); // biscuits keep lasting 1.5×
    const p = posterior(s);
    expect(p.factor).toBeGreaterThan(1.3);
    expect(p.factor).toBeLessThan(1.5);
    expect(p.sd).toBeLessThan(0.1);
  });
  it("matches the closed-form Normal–Normal update", () => {
    const p = posterior({ n: 1, sumLogRatio: 0.5 }, 0, 1, 1);
    expect(p.mean).toBeCloseTo(0.25);
    expect(p.sd).toBeCloseTo(Math.SQRT1_2);
  });
});
