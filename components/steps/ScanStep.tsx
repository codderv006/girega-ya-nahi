"use client";

import { useEffect, useRef, useState } from "react";
import { prepareImage, type PreparedImage } from "@/lib/client/image";
import { Mascot } from "../Mascot";

const SCAN_MS = 1600;

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

export function ScanStep({
  image,
  onImage,
  onNext,
  onSkip,
}: {
  image: PreparedImage | null;
  onImage: (i: PreparedImage | null) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Set only for a photo taken on this visit, so coming back here never auto-skips.
  const [scanning, setScanning] = useState(false);
  const next = useRef(onNext);
  next.current = onNext;

  // Fresh photo → play the scan for a beat, then move on automatically.
  useEffect(() => {
    if (!scanning) return;
    const id = setTimeout(() => next.current(), SCAN_MS);
    return () => clearTimeout(id);
  }, [scanning, image]);

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    setErr(null);
    try {
      onImage(await prepareImage(f));
      setScanning(true);
    } catch {
      setErr("Couldn't read that photo. Try another, or skip.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-8 sm:px-8">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <h1 className="font-display text-4xl font-extrabold leading-tight">Show us the biscuit.</h1>
          <p className="text-ink/70">Our vision lab will inspect it for cracks, chips and emotional readiness.</p>
        </div>
        <Mascot mood={image ? "scanning" : "happy"} size={84} />
      </div>

      <div className="relative mt-5 aspect-[4/3] w-full overflow-hidden rounded-3xl border-2 border-dashed border-ink/15 bg-white">
        {image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.previewUrl} alt="Your biscuit" className="h-full w-full object-cover" />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgb(255 210 63 / .35) 1px, transparent 1px), linear-gradient(90deg, rgb(255 210 63 / .35) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="pointer-events-none absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-wrapper-red/30 to-transparent" style={{ animation: "scan 1.8s linear infinite alternate" }} />
            <div className="absolute left-3 top-3 rounded-lg bg-ink/80 px-2 py-1 font-mono text-[11px] text-wrapper-yellow">
              {scanning ? "SCANNING SPECIMEN…" : "SPECIMEN ACQUIRED"} · {Math.round((image.data.length * 0.75) / 1024)} KB
            </div>
            {scanning && (
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-ink/20">
                <div key={image.previewUrl.length} className="h-full bg-wrapper-red" style={{ animation: `scanfill ${SCAN_MS}ms linear forwards` }} />
              </div>
            )}
          </>
        ) : (
          <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center">
            <span className="text-5xl" aria-hidden>📸</span>
            <span className="font-display text-xl font-bold">{busy ? "Developing photo…" : "Tap to snap your biscuit"}</span>
            <span className="text-balance text-sm text-ink/60">Shoot from directly above, biscuit flat on a plate, good light. It deserves dignity.</span>
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handle} />
          </label>
        )}
      </div>
      {err && <p className="mt-2 text-sm font-semibold text-wrapper-red">{err}</p>}

      <ViewGuide />

      <div className="mt-5 flex flex-col gap-3">
        {image ? (
          <>
            <button className="btn-primary" onClick={onNext}>{scanning ? "Scanning… tap to skip" : "Looks crunchy. Next →"}</button>
            <label className="btn-secondary cursor-pointer">
              Retake
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handle} />
            </label>
          </>
        ) : (
          <>
            <label className="btn-secondary cursor-pointer">
              Upload from gallery
              <input type="file" accept="image/*" className="sr-only" onChange={handle} />
            </label>
            <button className="text-sm font-semibold text-ink/70 underline underline-offset-4" onClick={onSkip}>
              Skip — use a standard-issue biscuit
            </button>
          </>
        )}
      </div>
    </section>
  );
}
