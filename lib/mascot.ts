export type Mood = "happy" | "nervous" | "sweating" | "dead" | "proud" | "scanning";

/**
 * "Biskit" — an original cartoon biscuit. Pure SVG string so the exact same
 * art renders in the browser and in the server-side share image.
 * `wet` (0..1) darkens the lower part of the body like a chai stain.
 */
export function mascotSvg(mood: Mood, opts: { wet?: number; animated?: boolean } = {}): string {
  const wet = Math.min(1, Math.max(0, opts.wet ?? (mood === "dead" ? 0.45 : 0)));
  const anim = opts.animated ?? false;
  const dead = mood === "dead";
  const body = dead ? "#F3D9A8" : "#E8B86D";
  const edge = dead ? "#D8B47A" : "#C98F3E";
  const ink = "#2B1B0E";
  const wetY = 170 - 150 * wet;

  const dots: string[] = [];
  for (const x of [58, 100, 142]) for (const y of [44, 150]) dots.push(`<circle cx="${x}" cy="${y}" r="4.5" fill="${edge}" opacity="0.75"/>`);
  for (const y of [70, 96, 122]) for (const x of [46, 154]) dots.push(`<circle cx="${x}" cy="${y}" r="4.5" fill="${edge}" opacity="0.75"/>`);

  let eyes = "";
  let mouth = "";
  let extras = "";
  switch (mood) {
    case "happy":
    case "scanning":
      eyes = `<circle cx="78" cy="88" r="9" fill="${ink}"/><circle cx="122" cy="88" r="9" fill="${ink}"/><circle cx="81" cy="85" r="3" fill="#fff"/><circle cx="125" cy="85" r="3" fill="#fff"/>`;
      mouth = `<path d="M82 112 Q100 130 118 112" stroke="${ink}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
      extras = `<circle cx="66" cy="108" r="7" fill="#D7263D" opacity="0.25"/><circle cx="134" cy="108" r="7" fill="#D7263D" opacity="0.25"/>`;
      if (mood === "scanning")
        extras += `<rect x="22" y="${anim ? 20 : 90}" width="156" height="4" fill="#D7263D" opacity="0.7">${anim ? '<animate attributeName="y" values="20;166;20" dur="1.6s" repeatCount="indefinite"/>' : ""}</rect>`;
      break;
    case "nervous":
      eyes = `<circle cx="78" cy="88" r="10" fill="#fff" stroke="${ink}" stroke-width="3"/><circle cx="122" cy="88" r="10" fill="#fff" stroke="${ink}" stroke-width="3"/><circle cx="80" cy="90" r="4.5" fill="${ink}"/><circle cx="124" cy="90" r="4.5" fill="${ink}"/>`;
      mouth = `<path d="M80 118 q5 -6 10 0 t10 0 t10 0 t10 0" stroke="${ink}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      extras = `<path d="M66 70 L88 76 M134 70 L112 76" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`;
      break;
    case "sweating":
      eyes = `<circle cx="78" cy="88" r="11" fill="#fff" stroke="${ink}" stroke-width="3"/><circle cx="122" cy="88" r="11" fill="#fff" stroke="${ink}" stroke-width="3"/><circle cx="78" cy="92" r="4" fill="${ink}"/><circle cx="122" cy="92" r="4" fill="${ink}"/>`;
      mouth = `<ellipse cx="100" cy="120" rx="11" ry="8" fill="${ink}"/>`;
      extras = `<path d="M150 50 q8 14 0 20 q-8 -6 0 -20z" fill="#6EC1E4">${anim ? '<animateTransform attributeName="transform" type="translate" values="0 0;0 22;0 0" dur="0.9s" repeatCount="indefinite"/>' : ""}</path><path d="M44 62 q7 12 0 17 q-7 -5 0 -17z" fill="#6EC1E4">${anim ? '<animateTransform attributeName="transform" type="translate" values="0 0;0 18;0 0" dur="1.1s" repeatCount="indefinite"/>' : ""}</path>`;
      break;
    case "proud":
      eyes = `<rect x="62" y="78" width="32" height="18" rx="6" fill="${ink}"/><rect x="106" y="78" width="32" height="18" rx="6" fill="${ink}"/><rect x="94" y="83" width="12" height="4" fill="${ink}"/><rect x="68" y="81" width="9" height="4" rx="2" fill="#fff" opacity="0.6"/>`;
      mouth = `<path d="M80 112 Q100 134 120 112 Z" fill="${ink}"/><path d="M88 116 Q100 124 112 116" fill="#D7263D"/>`;
      break;
    case "dead":
      eyes = `<path d="M70 80 l16 16 M86 80 l-16 16 M114 80 l16 16 M130 80 l-16 16" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`;
      mouth = `<path d="M86 120 Q100 112 114 120" stroke="${ink}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      extras = `<ellipse cx="100" cy="8" rx="38" ry="8" fill="none" stroke="#FFD23F" stroke-width="6"/>`;
      break;
  }

  const legs = dead
    ? `<path d="M30 170 q12 18 24 0 q12 18 23 0 q12 18 23 0 q12 18 23 0 q12 18 23 0 q12 18 24 0" fill="${body}" stroke="${edge}" stroke-width="5" stroke-linejoin="round"/>`
    : `<path d="M76 168 v26 M124 168 v26" stroke="${ink}" stroke-width="6" stroke-linecap="round"/><ellipse cx="70" cy="198" rx="12" ry="6" fill="#D7263D"/><ellipse cx="130" cy="198" rx="12" ry="6" fill="#D7263D"/>`;
  const arms = dead
    ? ""
    : `<path d="M30 110 q-18 6 -20 24 M170 110 q18 6 20 24" stroke="${ink}" stroke-width="6" fill="none" stroke-linecap="round"/>`;

  const bob = anim && !dead ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" dur="${mood === "sweating" ? "0.35s" : "1.8s"}" repeatCount="indefinite"/>` : "";
  const ghostFloat = anim && dead ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 -8;0 0" dur="2.4s" repeatCount="indefinite"/>` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -6 208 216" width="100%" height="100%" role="img" aria-label="Biskit the biscuit, ${mood}">
<defs><clipPath id="bk-body"><rect x="30" y="20" width="140" height="150" rx="20"/></clipPath></defs>
<g opacity="${dead ? 0.85 : 1}">${bob}${ghostFloat}
${legs}${arms}
<rect x="30" y="20" width="140" height="150" rx="20" fill="${body}" stroke="${edge}" stroke-width="6"/>
${wet > 0 ? `<rect x="30" y="${wetY}" width="140" height="${170 - wetY}" fill="#A0642B" opacity="0.45" clip-path="url(#bk-body)"/>` : ""}
${dots.join("")}
${eyes}${mouth}${extras}
</g></svg>`;
}

export function mascotDataUri(mood: Mood, opts?: { wet?: number }): string {
  return `data:image/svg+xml;base64,${Buffer.from(mascotSvg(mood, { ...opts, animated: false })).toString("base64")}`;
}
