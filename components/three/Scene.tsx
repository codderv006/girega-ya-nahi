"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Biscuit } from "./Biscuit";
import { ChaiCup } from "./ChaiCup";
import type { SceneState } from "./types";

/** Ripple when the biscuit first touches the chai (the splash triggers its own). */
function RippleWatcher({ state }: { state: React.RefObject<SceneState> }) {
  const prev = useRef(0);
  useFrame((f) => {
    const s = state.current;
    if (!s) return;
    if (prev.current < 0.55 && s.dip >= 0.55) s.ripple = f.clock.elapsedTime;
    prev.current = s.dip;
  });
  return null;
}

/** Fit the mug + raised biscuit into whatever box the canvas gets. */
function CameraRig({ compact }: { compact: boolean }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    // Content box: mug bottom (-0.62) to raised biscuit top (~1.75); mug + handle width ~1.7.
    const top = 1.8;
    const bottom = -0.68;
    const contentH = top - bottom;
    const contentW = 1.75;
    const dist = Math.max(contentH / (2 * tanHalf), contentW / (2 * tanHalf * aspect)) * (compact ? 1.02 : 1.08);
    const midY = (top + bottom) / 2;
    cam.position.set(0, midY + dist * 0.18, dist);
    cam.lookAt(0, midY, 0);
    cam.updateProjectionMatrix();
  }, [camera, size, compact]);
  return null;
}

export default function Scene({
  state,
  dunkDepth = 0.4,
  compact = false,
  className = "",
}: {
  state: React.RefObject<SceneState>;
  dunkDepth?: number;
  compact?: boolean;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  // Pause rendering while offscreen.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className={className}>
      <Canvas
        dpr={[1, 1.5]}
        frameloop={visible ? "always" : "never"}
        camera={{ fov: 38, position: [0, 1, 3.9] }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        aria-label="3D biscuit hovering over a cup of chai"
      >
        <CameraRig compact={compact} />
        <hemisphereLight args={["#ffffff", "#e6d3b3", 1.3]} />
        <directionalLight position={[2.5, 4, 3.5]} intensity={1.7} color="#fff6e8" />
        <directionalLight position={[-3, 1.5, 2]} intensity={0.45} color="#ffe7b8" />
        <ChaiCup state={state} />
        <Biscuit state={state} dunkDepth={dunkDepth} />
        <RippleWatcher state={state} />
      </Canvas>
    </div>
  );
}
