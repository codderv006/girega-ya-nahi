"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { mascotSvg, type Mood } from "@/lib/mascot";

export function Mascot({ mood, wet = 0, size = 160, className = "" }: { mood: Mood; wet?: number; size?: number; className?: string }) {
  const reduce = useReducedMotion();
  const html = useMemo(() => mascotSvg(mood, { wet, animated: !reduce }), [mood, wet, reduce]);
  return (
    <div className={className} style={{ width: size, height: size * 1.04 }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={mood}
          initial={reduce ? false : { scale: 0.85, rotate: -6, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={reduce ? undefined : { scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 18 }}
          className="h-full w-full"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </AnimatePresence>
    </div>
  );
}
