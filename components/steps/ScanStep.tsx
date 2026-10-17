"use client";

import { useRef, useState } from "react";
import { prepareImage, type PreparedImage } from "@/lib/client/image";
import type { CachedVision, VisionCheckResponse } from "@/lib/schemas";
import { MIN_COLOUR_SCORE } from "@/lib/vision/threshold";
import { Mascot } from "../Mascot";

/** Do / don't: the vision lab needs the face of the biscuit, not its edge. */
function ViewGuide() {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2" aria-label="Photo guide">
      <figure className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-3">
        <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0" aria-hidden>
          <rect x="9" y="6" width="30" height="36" rx="4" fill="#E2B06C" stroke="#C98F3E" strokeWidth="2" />
          <rect x="14" y="11" width="20" height="26" rx="2" fill="none" stroke="#C98F3E" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
        <figcaption className="min-w-0">
          <span className="one-line block font-display text-base font-bold text-[#2f8a4a]">✓ Top view</span>
          <span className="one-line block text-xs text-ink/55">Flat, from above</span>
        </figcaption>
      </figure>
      <figure className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-3">
        <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0" aria-hidden>
          <rect x="6" y="20" width="36" height="8" rx="3" fill="#E2B06C" stroke="#C98F3E" strokeWidth="2" />
          <line x1="10" y1="10" x2="38" y2="38" stroke="#D7263D" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <figcaption className="min-w-0">
          <span className="one-line block font-display text-base font-bold text-wrapper-red">✗ Edge view</span>
          <span className="one-line block text-xs text-ink/55">Side-on hides cracks</span>
        </figcaption>
      </figure>
    </div>
  );
}

type Phase = "idle" | "checking" | "ok" | "rejected" | "side-view";

/** Keep the scan animation on screen at least this long, even if the check is instant. */
const MIN_SCAN_MS = 1200;
/** Pause on the "confirmed" state before moving on. */
const CONFIRM_MS = 700;

async function inspect(img: PreparedImage): Promise<VisionCheckResponse> {
  try {
    const res = await fetch("/api/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: { mimeType: img.mimeType, data: img.data }, colourScore: img.colourScore }),
    });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as VisionCheckResponse;
  } catch {
    // Server unreachable: decide on-device from colour alone.
    const looksLikeBiscuit = img.colourScore >= MIN_COLOUR_SCORE;
    return {
      verdict: looksLikeBiscuit ? "unverified" : "not-biscuit",
      message: looksLikeBiscuit ? "Couldn't reach the vision lab, but the colours check out." : "Our colour sensors can't find any biscuit in that photo.",
      vision: {
        source: "fallback",
        biscuit: { isGlucoseBiscuit: true, confidence: 0.5, brokenEdges: 0, thicknessMm: 4.8, defectScore: 0.1, notes: "Offline colour check only." },
      },
    };
  }
}

export function ScanStep({
  image,
  vision,
  onImage,
  onVision,
  onNext,
  onSkip,
}: {
  image: PreparedImage | null;
  vision: CachedVision | null;
  onImage: (i: PreparedImage | null) => void;
  onVision: (v: CachedVision | null) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Coming back to a photo that already passed: stay put (no auto-advance).
  const [phase, setPhase] = useState<Phase>(image && vision ? "ok" : image ? "rejected" : "idle");
  const [message, setMessage] = useState<string | null>(image && !vision ? "That photo didn't pass the biscuit check." : null);
  const [pending, setPending] = useState<CachedVision | null>(null);
  const run = useRef(0);
  const next = useRef(onNext);
  next.current = onNext;

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const id = ++run.current;
    setBusy(true);
    setErr(null);
    setMessage(null);
    onVision(null);
    let img: PreparedImage;
    try {
      img = await prepareImage(f);
    } catch {
      setBusy(false);
      setErr("Couldn't read that photo. Try another, or skip.");
      return;
    }
    setBusy(false);
    onImage(img);
    setPhase("checking");

    const [check] = await Promise.all([inspect(img), new Promise((r) => setTimeout(r, MIN_SCAN_MS))]);
    if (id !== run.current) return; // a newer photo replaced this one

    setMessage(check.message);
    if (check.verdict === "not-biscuit") {
      setPhase("rejected");
    } else if (check.verdict === "side-view") {
      setPending(check.vision);
      setPhase("side-view");
    } else {
      onVision(check.vision);
      setPhase("ok");
      setTimeout(() => {
        if (id === run.current) next.current();
      }, CONFIRM_MS);
    }
  }

  const retakeInput = <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handle} />;
  const galleryInput = <input type="file" accept="image/*" className="sr-only" onChange={handle} />;
  const scanning = phase === "checking";
  const badge = scanning ? "CHECKING IT'S A BISCUIT…" : phase === "rejected" ? "NOT A BISCUIT" : phase === "side-view" ? "EDGE VIEW DETECTED" : "BISCUIT CONFIRMED ✓";

  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-8 sm:px-8">
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-4xl font-extrabold leading-tight">Show us the biscuit.</h1>
          <p className="text-balance text-ink/65">Our vision lab will inspect it for cracks, chips and emotional readiness.</p>
        </div>
        <Mascot mood={phase === "rejected" ? "nervous" : image ? "scanning" : "happy"} size={84} />
      </div>

      <div
        className={`relative mt-5 aspect-4/3 w-full overflow-hidden rounded-3xl border-2 bg-white ${
          phase === "rejected" ? "border-wrapper-red" : phase === "side-view" ? "border-wrapper-yellow" : "border-dashed border-ink/15"
        }`}
      >
        {image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.previewUrl} alt="Your photo" className={`h-full w-full object-cover ${phase === "rejected" ? "opacity-50 grayscale" : ""}`} />
            {scanning && (
              <>
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgb(255 210 63 / .35) 1px, transparent 1px), linear-gradient(90deg, rgb(255 210 63 / .35) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-x-0 h-1/3 bg-linear-to-b from-transparent via-wrapper-red/30 to-transparent"
                  style={{ animation: "scan 1.2s linear infinite alternate" }}
                />
              </>
            )}
            <div className="absolute left-3 top-3 rounded-lg bg-ink/80 px-2 py-1 font-mono text-[11px] text-wrapper-yellow">{badge}</div>
          </>
        ) : (
          <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center">
            <span className="text-5xl" aria-hidden>📸</span>
            <span className="font-display text-xl font-bold">{busy ? "Developing photo…" : "Tap to snap your biscuit"}</span>
            <span className="text-balance text-sm text-ink/60">Shoot from directly above, biscuit flat on a plate, good light. It deserves dignity.</span>
            {retakeInput}
          </label>
        )}
      </div>
      {err && <p className="mt-2 text-sm font-semibold text-wrapper-red">{err}</p>}

      {phase === "rejected" && (
        <div className="mt-3 rounded-2xl border border-wrapper-red/30 bg-wrapper-red/5 p-4" role="alert">
          <p className="font-display text-lg font-bold text-wrapper-red">{message}</p>
          <p className="mt-1 text-sm text-ink/70">Please upload a photo of a biscuit. Ideally a glucose one, face up, on a plate.</p>
        </div>
      )}
      {phase === "side-view" && (
        <div className="mt-3 rounded-2xl border border-wrapper-yellow bg-wrapper-yellow/15 p-4" role="alert">
          <p className="font-display text-lg font-bold">{message}</p>
          <p className="mt-1 text-sm text-ink/70">From the edge we can&apos;t see cracks or broken corners, so the prediction gets worse.</p>
        </div>
      )}
      {phase === "ok" && message && <p className="mt-2 text-balance text-sm italic text-ink/60">“{message}”</p>}

      {(phase === "idle" || phase === "rejected" || phase === "side-view") && <ViewGuide />}

      <div className="mt-5 flex flex-col gap-3">
        {phase === "idle" && (
          <>
            <label className="btn-secondary cursor-pointer">
              Upload from gallery
              {galleryInput}
            </label>
            <button className="text-sm font-semibold text-ink/70 underline underline-offset-4" onClick={onSkip}>
              Skip — use a standard-issue biscuit
            </button>
          </>
        )}
        {scanning && (
          <button className="btn-primary" disabled>
            Inspecting the specimen…
          </button>
        )}
        {phase === "ok" && (
          <>
            <button className="btn-primary" onClick={onNext}>
              Looks crunchy. Next →
            </button>
            <label className="btn-secondary cursor-pointer">
              Retake
              {retakeInput}
            </label>
          </>
        )}
        {phase === "rejected" && (
          <>
            <label className="btn-primary cursor-pointer">
              📸 Retake with a biscuit
              {retakeInput}
            </label>
            <label className="btn-secondary cursor-pointer">
              Upload from gallery
              {galleryInput}
            </label>
            <button className="text-sm font-semibold text-ink/70 underline underline-offset-4" onClick={onSkip}>
              No biscuit handy? Use a standard-issue one
            </button>
          </>
        )}
        {phase === "side-view" && (
          <>
            <label className="btn-primary cursor-pointer">
              📸 Retake from above
              {retakeInput}
            </label>
            <button
              className="btn-secondary"
              onClick={() => {
                onVision(pending);
                onNext();
              }}
            >
              Use it anyway
            </button>
          </>
        )}
      </div>
    </section>
  );
}
