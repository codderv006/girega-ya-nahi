"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import type { PreparedImage } from "@/lib/client/image";
import type { DunkRecord } from "@/lib/types";
import type { CachedVision } from "@/lib/schemas";
import { SiteHeader } from "./SiteHeader";
import { defaultSceneState, type SceneState } from "./three/types";
import { ScanStep } from "./steps/ScanStep";
import { SetupStep, type Setup } from "./steps/SetupStep";
import { PredictStep } from "./steps/PredictStep";
import { TestStep } from "./steps/TestStep";
import { ShareStep } from "./steps/ShareStep";

type Step = "scan" | "setup" | "predict" | "test" | "share";
const STEPS: { id: Step; label: string }[] = [
  { id: "scan", label: "Scan" },
  { id: "setup", label: "Chai" },
  { id: "predict", label: "Predict" },
  { id: "test", label: "Dunk" },
  { id: "share", label: "Share" },
];

export const DEFAULT_SETUP: Setup = { chaiType: "cutting", vessel: "mug", tempC: 78, dunkDepth: 0.4, style: "vertical" };

export function DunkFlow() {
  const [step, setStep] = useState<Step>("scan");
  const [biscuit, setBiscuit] = useState<PreparedImage | null>(null);
  const [biscuitVision, setBiscuitVision] = useState<CachedVision | null>(null);
  const [chai, setChai] = useState<PreparedImage | null>(null);
  const [setup, setSetup] = useState<Setup>(DEFAULT_SETUP);
  const [record, setRecord] = useState<DunkRecord | null>(null);
  const [runKey, setRunKey] = useState(0);
  const scene = useRef<SceneState>(defaultSceneState());

  const idx = STEPS.findIndex((s) => s.id === step);
  const go = (s: Step) => {
    setStep(s);
    window.scrollTo({ top: 0 });
  };

  return (
    <main className="flex min-h-dvh flex-col">
      <SiteHeader />
      {step !== "predict" && (
        <ol className="mx-auto mb-2 flex w-full max-w-3xl items-center gap-1.5 px-4 sm:px-8" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex flex-1 flex-col items-center gap-1">
              <span className={`h-2 w-full rounded-full ${i <= idx ? "bg-wrapper-red" : "bg-biscuit-dark/25"}`} />
              <span className={`one-line text-xs font-semibold ${i === idx ? "text-ink" : "text-ink/45"}`} aria-current={i === idx ? "step" : undefined}>
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step + (step === "predict" ? runKey : "")}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="flex flex-1 flex-col"
        >
          {step === "scan" && (
            <ScanStep
              image={biscuit}
              vision={biscuitVision}
              onImage={setBiscuit}
              onVision={setBiscuitVision}
              onNext={() => go("setup")}
              onSkip={() => {
                setBiscuit(null);
                setBiscuitVision(null);
                go("setup");
              }}
            />
          )}
          {step === "setup" && (
            <SetupStep
              setup={setup}
              onChange={setSetup}
              chaiImage={chai}
              onChaiImage={setChai}
              scene={scene}
              onBack={() => go("scan")}
              onNext={() => {
                setRecord(null);
                setRunKey((k) => k + 1);
                go("predict");
              }}
            />
          )}
          {step === "predict" && (
            <PredictStep
              request={{
                ...setup,
                biscuitImage: biscuit ? { mimeType: biscuit.mimeType, data: biscuit.data } : undefined,
                biscuitVision: biscuit && biscuitVision ? biscuitVision : undefined,
                chaiImage: chai ? { mimeType: chai.mimeType, data: chai.data } : undefined,
              }}
              scene={scene}
              onRecord={setRecord}
              record={record}
              onBack={() => go("setup")}
              onRerun={() => {
                setRecord(null);
                setRunKey((k) => k + 1);
              }}
              onRetake={() => {
                setBiscuit(null);
                setBiscuitVision(null);
                go("scan");
              }}
              onNext={() => go("test")}
            />
          )}
          {step === "test" && record && (
            <TestStep record={record} onRecord={setRecord} onNext={() => go("share")} onBack={() => go("predict")} />
          )}
          {step === "share" && record && (
            <ShareStep
              record={record}
              onAgain={() => {
                setRecord(null);
                go("setup");
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
