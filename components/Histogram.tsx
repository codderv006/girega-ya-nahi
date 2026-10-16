"use client";

import { motion, useReducedMotion } from "framer-motion";

export function Histogram({
  bins,
  marker,
  height = 70,
}: {
  bins: { binStart: number; binEnd: number; count: number }[];
  marker?: number;
  height?: number;
}) {
  const reduce = useReducedMotion();
  if (!bins.length) return null;
  const max = Math.max(...bins.map((b) => b.count), 1);
  const lo = bins[0].binStart;
  const hi = bins[bins.length - 1].binEnd;
  const W = 240;
  const bw = W / bins.length;
  const mx = marker != null ? ((marker - lo) / (hi - lo)) * W : null;
  return (
    <figure className="mt-2">
      <svg viewBox={`0 0 ${W} ${height + 14}`} className="w-full max-w-[360px]" role="img" aria-label="Distribution of simulated survival times">
        {bins.map((b, i) => {
          const h = (b.count / max) * height;
          return (
            <motion.rect
              key={i}
              x={i * bw + 1}
              width={bw - 2}
              y={height - h}
              height={h}
              rx={1.5}
              fill="#E8B86D"
              initial={reduce ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              style={{ transformOrigin: `0px ${height}px` }}
              transition={{ delay: i * 0.02, duration: 0.3 }}
            />
          );
        })}
        {mx != null && <line x1={mx} x2={mx} y1={0} y2={height} stroke="#D7263D" strokeWidth={2} strokeDasharray="3 2" />}
        <text x={0} y={height + 12} fontSize={9} fill="#c8b48f" fontFamily="monospace">{lo.toFixed(1)}s</text>
        <text x={W} y={height + 12} fontSize={9} fill="#c8b48f" textAnchor="end" fontFamily="monospace">{hi.toFixed(1)}s</text>
      </svg>
    </figure>
  );
}
