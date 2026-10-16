"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { Mascot } from "../Mascot";
import type { Mood } from "@/lib/mascot";
import type { SceneState } from "./types";

const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => <SceneLoading />,
});

/** Quiet placeholder while the 3D chunk downloads (no flash of a different cup). */
function SceneLoading() {
  return (
    <div className="grid h-full w-full place-items-center">
      <div className="h-24 w-24 animate-pulse rounded-full bg-biscuit/25" aria-label="Warming up the chai…" />
    </div>
  );
}

/** No-WebGL / reduced-motion stand-in: mascot over a flat cup. */
export function StaticChai({ mood = "happy", wet = 0 }: { mood?: Mood; wet?: number }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-end pb-4">
      <Mascot mood={mood} wet={wet} size={130} />
      <div className="relative -mt-6 h-24 w-40 overflow-hidden rounded-b-[48px] rounded-t-lg border-4 border-ink bg-[#B3562F]">
        <div className="absolute inset-x-1 top-1 h-5 rounded-full bg-chai" />
      </div>
    </div>
  );
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function LazyScene(props: {
  state: React.RefObject<SceneState>;
  dunkDepth?: number;
  compact?: boolean;
  className?: string;
  fallbackMood?: Mood;
  fallbackWet?: number;
}) {
  const reduce = useReducedMotion();
  const [gl, setGl] = useState<boolean | null>(null);
  useEffect(() => setGl(hasWebGL()), []);

  if (reduce || gl === false) {
    return (
      <div className={props.className}>
        <StaticChai mood={props.fallbackMood} wet={props.fallbackWet} />
      </div>
    );
  }
  if (gl === null)
    return (
      <div className={props.className}>
        <SceneLoading />
      </div>
    );
  return <Scene state={props.state} dunkDepth={props.dunkDepth} compact={props.compact} className={props.className} />;
}
