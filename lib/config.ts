export const APP_NAME = "Girega Ya Nahi?";
export const APP_SLUG = "giregayanahi";
export const REPO_URL = "https://github.com/codderv006/girega-ya-nahi";

/** Public origin: explicit env, else Vercel's production domain, else local dev. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const TAGLINE = "G maane Genius. D maane Dunk.";

export const TAGLINES = [
  "G maane Genius. D maane Dunk.",
  "Har dunk ka hisaab.",
  "Biscuit ki zindagi, seconds mein.",
  "Dunk responsibly.",
  "Peer-reviewed by nobody. Trusted by everybody.",
  "Washburn never accounted for kadak chai.",
];

export const LOADING_LINES = [
  "Consulting the chai elders…",
  "Calibrating kadakness…",
  "Asking the biscuit how it feels…",
  "Warming up the capillaries…",
  "Negotiating with surface tension…",
  "Bribing the Monte Carlo casino…",
];

export const CHAI_TYPES = [
  { id: "cutting", label: "Cutting", emoji: "✂️", blurb: "Half glass, full attitude" },
  { id: "kadak", label: "Kadak", emoji: "💪", blurb: "Boiled till it apologised" },
  { id: "adrak", label: "Adrak", emoji: "🫚", blurb: "Ginger. Spicy. Unforgiving." },
  { id: "elaichi", label: "Elaichi", emoji: "🌿", blurb: "Fragrant, deceptively soft" },
  { id: "doodh", label: "Doodh-wali", emoji: "🥛", blurb: "More milk than chai" },
  { id: "office", label: "Office-machine", emoji: "🏢", blurb: "Button no. 3. Regret." },
] as const;

export const VESSELS = [
  { id: "mug", label: "Ceramic mug", emoji: "☕", blurb: "Handle included. Civilised." },
  { id: "kulhad", label: "Kulhad", emoji: "🏺", blurb: "Clay. Earthy. Cools fast." },
  { id: "steel", label: "Steel glass", emoji: "🥛", blurb: "Holds heat like a grudge" },
  { id: "paper", label: "Paper cup", emoji: "🥤", blurb: "Structurally optimistic" },
] as const;

export const DUNK_STYLES = [
  { id: "vertical", label: "Vertical", tag: "amateur", blurb: "Straight down. Classic mistake." },
  { id: "horizontal", label: "Horizontal", tag: "Fisher-approved", blurb: "Flat on the surface. Science." },
  { id: "spiral", label: "Spiral", tag: "chaotic", blurb: "Swirl it. Feel alive." },
] as const;

export type ChaiTypeId = (typeof CHAI_TYPES)[number]["id"];
export type VesselId = (typeof VESSELS)[number]["id"];
export type DunkStyleId = (typeof DUNK_STYLES)[number]["id"];

export const HEAT_MIN_C = 50;
export const HEAT_MAX_C = 95;

export function heatLabel(tempC: number): string {
  if (tempC < 59) return "Lukewarm regret";
  if (tempC < 68) return "Warm-ish";
  if (tempC < 77) return "Proper hot";
  if (tempC < 86) return "Tapri fresh";
  return "Lava";
}

export function labelOf<T extends { id: string; label: string }>(list: readonly T[], id: string) {
  return list.find((x) => x.id === id)?.label ?? id;
}
