import type { ChaiTypeId, DunkStyleId, VesselId } from "./config";

export interface DunkInputs {
  chaiType: ChaiTypeId;
  vessel: VesselId;
  tempC: number;
  dunkDepth: number;
  style: DunkStyleId;
}

export interface Prediction {
  medianS: number;
  p05S: number;
  p95S: number;
  ciHalfWidthS: number;
  optimalS: number;
  failureSaturation: number;
  causeOfDeath: string;
  oneLiner: string;
  learnedFrom: number;
  correctionFactor: number;
}

export type VerdictTier = "oracle" | "beat" | "betrayed" | "chicken";

export interface DunkResult {
  actualS: number;
  outcome: "fell" | "survived";
  errorS: number; // actual − predicted
  tier: VerdictTier;
  verdict: string;
  nickname?: string;
  at: number;
}

export interface DunkRecord {
  id: string;
  createdAt: number;
  inputs: DunkInputs;
  prediction: Prediction;
  visionSource: "gemini" | "fallback" | "standard-issue";
  result?: DunkResult;
}

export interface StageEvent {
  index: number;
  id: string;
  name: string;
  ms: number;
  formula?: string;
  inputs: Record<string, unknown>;
  output: Record<string, unknown>;
  logs: string[];
  histogram?: { binStart: number; binEnd: number; count: number }[];
}

export type PipelineEvent =
  | { type: "stage-start"; index: number; id: string; name: string }
  | { type: "stage-done"; stage: StageEvent }
  | { type: "result"; record: DunkRecord }
  | { type: "error"; message: string; code?: "not-biscuit" };
