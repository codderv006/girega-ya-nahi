import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { APP_NAME, CHAI_TYPES, DUNK_STYLES, VESSELS, labelOf } from "@/lib/config";
import { getStore } from "@/lib/store";
import { shareLine, verdictHeadline } from "@/lib/verdict";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const rec = await getStore().getDunk(id);
  if (!rec) return { title: APP_NAME };
  const title = rec.result ? `${verdictHeadline(rec.result)} · ${APP_NAME}` : `${APP_NAME} prediction`;
  const description = shareLine(rec);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: `/api/og?id=${id}&format=wide`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`/api/og?id=${id}&format=wide`] },
  };
}

export default async function ResultPage({ params }: Props) {
  const { id } = await params;
  const rec = await getStore().getDunk(id);
  if (!rec) notFound();
  const p = rec.prediction;
  const r = rec.result;

  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 sm:px-8 md:grid-cols-[420px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/og?id=${id}&format=story`} alt="Result card" className="w-full rounded-2xl border border-ink/10 shadow-sm" />
        <div>
          <p className="font-mono text-xs text-ink/50">Dunk #{rec.id}</p>
          <h1 className="font-display text-5xl font-extrabold">{r ? verdictHeadline(r) : "Prediction locked."}</h1>
          <p className="mt-2 text-lg text-ink/75">“{shareLine(rec)}”</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Item k="Predicted" v={`${p.medianS.toFixed(2)} s (±${p.ciHalfWidthS.toFixed(2)})`} />
            <Item k={r?.outcome === "survived" ? "Survived" : "Actual"} v={r ? `${r.actualS.toFixed(2)} s` : "Not dunked yet"} />
            <Item k="Chai" v={`${labelOf(CHAI_TYPES, rec.inputs.chaiType)}, ${rec.inputs.tempC}°C`} />
            <Item k="Vessel" v={labelOf(VESSELS, rec.inputs.vessel)} />
            <Item k="Style" v={`${labelOf(DUNK_STYLES, rec.inputs.style)}, ${Math.round(rec.inputs.dunkDepth * 100)}% deep`} />
            <Item k="Forecast" v={p.causeOfDeath} />
          </dl>
          {r && <p className="mt-4 font-display text-2xl font-bold text-wrapper-red">{r.verdict}</p>}
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/dunk" className="btn-primary">Predict my own biscuit</Link>
            <a href={`/api/og?id=${id}&format=story&kind=certificate`} className="btn-secondary" target="_blank" rel="noreferrer">
              {r?.outcome === "survived" ? "Survival certificate" : "Death certificate"}
            </a>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-widest text-chai">{k}</dt>
      <dd className="font-display text-lg font-bold leading-snug">{v}</dd>
    </div>
  );
}
