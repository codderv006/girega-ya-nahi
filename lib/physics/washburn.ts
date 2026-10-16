/**
 * Washburn (1921) capillary penetration:
 *   L(t) = sqrt(γ · r · cosθ · t / (2η))
 * and its inverse, the time for the wet front to travel L:
 *   t = 2η L² / (γ r cosθ)
 */
export function penetrationDepth(t: number, gamma: number, r: number, theta: number, eta: number): number {
  if (t <= 0) return 0;
  return Math.sqrt((gamma * r * Math.cos(theta) * t) / (2 * eta));
}

export function timeToDepth(L: number, gamma: number, r: number, theta: number, eta: number): number {
  const c = gamma * r * Math.cos(theta);
  if (c <= 0) return Infinity;
  return (2 * eta * L * L) / c;
}
