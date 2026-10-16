import { ImageResponse } from "next/og";
import { getStore } from "@/lib/store";
import { APP_NAME, CHAI_TYPES, DUNK_STYLES, TAGLINE, VESSELS, labelOf } from "@/lib/config";
import { mascotDataUri, type Mood } from "@/lib/mascot";
import { shareLine, verdictHeadline } from "@/lib/verdict";
import type { DunkRecord } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const C = {
  biscuit: "#E8B86D",
  biscuitDark: "#C98F3E",
  yellow: "#FFD23F",
  red: "#D7263D",
  chai: "#A0642B",
  cream: "#FFF6E5",
  ink: "#2B1B0E",
};

// Satori needs TTF/OTF. Old user agents make Google Fonts serve TTF.
let fontCache: Promise<ArrayBuffer | null> | null = null;
function loadDisplayFont(): Promise<ArrayBuffer | null> {
  fontCache ??= (async () => {
    try {
      const css = await fetch("https://fonts.googleapis.com/css2?family=Baloo+2:wght@800", {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.30 (KHTML, like Gecko) Safari/534.30" },
        signal: AbortSignal.timeout(4000),
      }).then((r) => r.text());
      // Satori reads TTF/OTF/WOFF (not WOFF2). Prefer the latin subset block.
      const latin = css.split("/* latin */")[1] ?? css;
      const url = latin.match(/src: url\((.+?)\) format\('(?:truetype|opentype|woff)'\)/)?.[1];
      if (!url) return null;
      return await fetch(url, { signal: AbortSignal.timeout(4000) }).then((r) => r.arrayBuffer());
    } catch {
      fontCache = null; // retry next time
      return null;
    }
  })();
  return fontCache;
}

function moodFor(rec: DunkRecord): Mood {
  const r = rec.result;
  if (!r) return "nervous";
  return r.outcome === "fell" ? "dead" : "proud";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const format = url.searchParams.get("format") === "wide" ? "wide" : "story";
  const kind = url.searchParams.get("kind") === "certificate" ? "certificate" : "card";
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  const [w, h] = format === "wide" ? [1200, 630] : [1080, 1350];

  const rec = id ? await getStore().getDunk(id) : null;
  const font = await loadDisplayFont();
  const fonts = font ? [{ name: "Baloo", data: font, weight: 800 as const, style: "normal" as const }] : undefined;
  const display = font ? "Baloo" : "sans-serif";

  const body = !rec
    ? fallbackCard(display)
    : kind === "certificate"
      ? certificate(rec, display, format)
      : card(rec, display, format, host);

  return new ImageResponse(body, {
    width: w,
    height: h,
    fonts,
    headers: { "Cache-Control": rec?.result ? "public, max-age=86400, immutable" : "no-store" },
  });
}

function Bands() {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <div style={{ height: 18, background: C.red }} />
      <div style={{ height: 12, background: C.yellow }} />
    </div>
  );
}

function fallbackCard(display: string) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.cream, color: C.ink, fontFamily: display }}>
      <img src={mascotDataUri("happy")} width={360} height={374} alt="" />
      <div style={{ fontSize: 96, marginTop: 30 }}>{APP_NAME}</div>
      <div style={{ fontSize: 40, color: C.chai }}>{TAGLINE}</div>
    </div>
  );
}

function card(rec: DunkRecord, display: string, format: "story" | "wide", host: string) {
  const r = rec.result;
  const wide = format === "wide";
  const p = rec.prediction;
  const head = r ? verdictHeadline(r) : "Prediction locked.";
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.cream, color: C.ink, fontFamily: display }}>
      <Bands />
      <div style={{ display: "flex", flex: 1, flexDirection: wide ? "row" : "column", alignItems: "center", padding: wide ? "30px 60px" : "50px 70px", gap: wide ? 50 : 20 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: wide ? 40 : 52, color: C.red, letterSpacing: -1 }}>{APP_NAME}</div>
          <img src={mascotDataUri(moodFor(rec), { wet: r?.outcome === "fell" ? 0.5 : 0.2 })} width={wide ? 300 : 400} height={wide ? 312 : 416} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: wide ? "flex-start" : "center", textAlign: wide ? "left" : "center" }}>
          <div style={{ fontSize: wide ? 88 : 120, lineHeight: 1 }}>{head}</div>
          <div style={{ display: "flex", gap: 24, marginTop: 24 }}>
            <Stat label="Predicted" value={`${p.medianS.toFixed(2)}s`} wide={wide} />
            {r && <Stat label={r.outcome === "fell" ? "Actual" : "Survived"} value={`${r.actualS.toFixed(2)}s`} wide={wide} accent />}
          </div>
          <div style={{ fontSize: wide ? 32 : 42, marginTop: 28, lineHeight: 1.2, maxWidth: wide ? 640 : 900, display: "flex" }}>{`“${shareLine(rec)}”`}</div>
          <div style={{ fontSize: wide ? 22 : 28, marginTop: 20, color: C.chai, display: "flex" }}>
            {`${labelOf(CHAI_TYPES, rec.inputs.chaiType)} chai · ${labelOf(VESSELS, rec.inputs.vessel)} · ${rec.inputs.tempC}°C · ${labelOf(DUNK_STYLES, rec.inputs.style)}`}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: wide ? "14px 60px" : "24px 70px", background: C.ink, color: C.yellow, fontSize: wide ? 24 : 30 }}>
        <span>{host}</span>
        <span>#GDGMAD @gdgmad</span>
      </div>
    </div>
  );
}

function Stat({ label, value, wide, accent }: { label: string; value: string; wide: boolean; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: accent ? C.red : C.biscuit, color: accent ? C.cream : C.ink, borderRadius: 28, padding: wide ? "12px 30px" : "18px 40px", border: `5px solid ${accent ? C.ink : C.biscuitDark}` }}>
      <span style={{ fontSize: wide ? 22 : 28, opacity: 0.85 }}>{label}</span>
      <span style={{ fontSize: wide ? 64 : 84, lineHeight: 1 }}>{value}</span>
    </div>
  );
}

function certificate(rec: DunkRecord, display: string, format: "story" | "wide") {
  const r = rec.result;
  const wide = format === "wide";
  const died = r?.outcome === "fell";
  const date = new Date(r?.at ?? rec.createdAt);
  const row = (k: string, v: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `3px dashed ${C.biscuitDark}`, padding: "10px 0", fontSize: wide ? 26 : 34 }}>
      <span style={{ color: C.chai }}>{k}</span>
      <span style={{ maxWidth: wide ? 640 : 620, textAlign: "right", display: "flex" }}>{v}</span>
    </div>
  );
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", padding: wide ? 24 : 40, background: C.ink, fontFamily: display }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.cream, border: `8px solid ${C.biscuitDark}`, boxShadow: `inset 0 0 0 6px ${C.cream}, inset 0 0 0 9px ${C.biscuitDark}`, borderRadius: 18, padding: wide ? "24px 50px" : "50px 60px", color: C.ink }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontSize: wide ? 22 : 28, color: C.red, letterSpacing: 4 }}>REPUBLIC OF CHAI · DEPT. OF DUNKS</span>
            <span style={{ fontSize: wide ? 56 : 92, lineHeight: 1 }}>Certificate</span>
            <span style={{ fontSize: wide ? 56 : 92, lineHeight: 1 }}>{died ? "of Death" : "of Survival"}</span>
          </div>
          <img src={mascotDataUri(died ? "dead" : "proud", { wet: 0.5 })} width={wide ? 150 : 190} height={wide ? 156 : 198} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: wide ? 10 : 30 }}>
          {row(died ? "Name of deceased" : "Name of survivor", r?.nickname ? `${r.nickname}'s Parle-G` : "One (1) Parle-G, unnamed")}
          {row(died ? "Time of death" : "Time in chai", r ? `${r.actualS.toFixed(2)} s after immersion` : "Pending")}
          {row("Date", date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }))}
          {row("Place", `${labelOf(VESSELS, rec.inputs.vessel)} of ${labelOf(CHAI_TYPES, rec.inputs.chaiType)} chai, ${rec.inputs.tempC}°C`)}
          {row("Cause", died ? rec.prediction.causeOfDeath : "Pulled out alive. Cause of life: cowardice or genius")}
          {row("Predicted", `${rec.prediction.medianS.toFixed(2)} s (±${rec.prediction.ciHalfWidthS.toFixed(2)})`)}
          {row("Attending algorithm", `${APP_NAME} v1 · Washburn-Fisher-Monte-Carlo`)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto", fontSize: wide ? 22 : 28, color: C.chai }}>
          <span>{`Ref. no. ${rec.id}`}</span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: wide ? 120 : 160, height: wide ? 120 : 160, borderRadius: 999, border: `6px solid ${C.red}`, color: C.red, fontSize: wide ? 20 : 26, transform: "rotate(-14deg)", flexDirection: "column" }}>
            <span>{died ? "RIP" : "STILL"}</span>
            <span>{died ? "DUNKED" : "CRUNCHY"}</span>
          </div>
          <span>#GDGMAD @gdgmad</span>
        </div>
      </div>
    </div>
  );
}
