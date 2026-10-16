"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { APP_SLUG } from "@/lib/config";
import { caption } from "@/lib/verdict";
import type { DunkRecord } from "@/lib/types";

const VARIANTS = [
  { id: "story", label: "Story card", q: "format=story&kind=card", w: 1080, h: 1350 },
  { id: "wide", label: "Wide card", q: "format=wide&kind=card", w: 1200, h: 630 },
  { id: "cert", label: "Death certificate", q: "format=story&kind=certificate", w: 1080, h: 1350 },
] as const;

export function ShareStep({ record, onAgain }: { record: DunkRecord; onAgain: () => void }) {
  const [variant, setVariant] = useState<(typeof VARIANTS)[number]["id"]>("story");
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const v = VARIANTS.find((x) => x.id === variant)!;
  const imgUrl = `/api/og?id=${record.id}&${v.q}&v=${record.result?.at ?? 0}`;
  const pageUrl = typeof window !== "undefined" ? `${window.location.origin}/r/${record.id}` : `/r/${record.id}`;
  const text = useMemo(() => caption(record, pageUrl), [record, pageUrl]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  async function getFile(): Promise<File> {
    const blob = await fetch(imgUrl).then((r) => r.blob());
    return new File([blob], `${APP_SLUG}-${record.id}-${variant}.png`, { type: "image/png" });
  }

  async function download() {
    const f = await getFile();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function share() {
    try {
      const f = await getFile();
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], text, title: "Girega Ya Nahi?" });
      } else if (navigator.share) {
        await navigator.share({ text, url: pageUrl, title: "Girega Ya Nahi?" });
      } else {
        await navigator.clipboard.writeText(text);
        flash("Sharing not supported here. Caption copied instead.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") flash("Share failed. Try download.");
    }
  }

  async function copy(s: string, msg: string) {
    try {
      await navigator.clipboard.writeText(s);
      flash(msg);
    } catch {
      flash("Clipboard blocked by the browser.");
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-12 sm:px-8">
      <h1 className="font-display text-4xl font-extrabold">Tell the world.</h1>
      <p className="text-ink/70">Post it, tag <b>@gdgmad</b>, and let the biscuit&apos;s legacy live on.</p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist">
        {VARIANTS.map((x) => (
          <button key={x.id} role="tab" aria-selected={variant === x.id} onClick={() => setVariant(x.id)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${variant === x.id ? "border-ink bg-ink text-white" : "border-ink/15 bg-white hover:border-ink/40"}`}>
            {x.label}
          </button>
        ))}
      </div>

      <div className="relative mx-auto mt-4 w-full overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm" style={{ aspectRatio: `${v.w} / ${v.h}`, maxWidth: v.w > v.h ? "100%" : 440 }}>
        {!loaded[imgUrl] && <div className="absolute inset-0 grid place-items-center font-display text-lg text-ink/50">Developing the card…</div>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={imgUrl} src={imgUrl} alt="Share card" className="relative h-full w-full" onLoad={() => setLoaded((l) => ({ ...l, [imgUrl]: true }))} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button className="btn-primary col-span-2 sm:col-span-1" onClick={share}>Share</button>
        <button className="btn-secondary" onClick={download}>Download</button>
        <button className="btn-secondary" onClick={() => copy(text, "Caption copied.")}>Copy caption</button>
        <button className="btn-secondary col-span-2 sm:col-span-1" onClick={() => copy(pageUrl, "Link copied.")}>Copy link</button>
      </div>

      <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-ink/10 bg-white p-4 font-sans text-sm text-ink/80">{text}</pre>

      <div className="mt-6 flex flex-wrap gap-2">
        <button className="btn-primary" onClick={onAgain}>Dunk another</button>
        <Link className="btn-secondary" href={`/r/${record.id}`}>Result page</Link>
        <Link className="btn-secondary" href="/leaderboard">Leaderboard</Link>
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-cream shadow-lg" role="status">
          {toast}
        </div>
      )}
    </section>
  );
}
