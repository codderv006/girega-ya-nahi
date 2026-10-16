"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { SceneState } from "./types";

const N = 56;
const GRAVITY = 5.5;
const FLOOR_Y = -0.64; // table level just under the mug
const RIM_Y = 0.34;

/**
 * Chai droplets thrown up when the broken piece hits the surface. A crown of
 * fast droplets clears the rim and runs down the outside of the mug.
 */
export function Splash({ state, rimRadius }: { state: React.RefObject<SceneState>; rimRadius: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => {
        const r = (k: number) => {
          const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
          return x - Math.floor(x);
        };
        const crown = i < N * 0.35; // these ones escape the mug
        return {
          angle: r(1) * Math.PI * 2,
          start: 0.05 + r(2) * 0.18,
          vr: crown ? 0.75 + r(3) * 0.45 : 0.15 + r(3) * 0.4,
          vy: crown ? 1.6 + r(4) * 0.7 : 1.0 + r(4) * 1.1,
          size: 0.6 + r(5) * 0.8,
        };
      }),
    [],
  );

  useFrame((frame) => {
    const s = state.current;
    const m = mesh.current;
    if (!s || !m) return;
    const age = frame.clock.elapsedTime - s.splash;
    const active = age >= 0 && age < 2.2;
    m.visible = active;
    if (!active) return;

    if (mat.current) {
      const k = s.milkiness;
      mat.current.color.setRGB(0.5 + k * 0.3, 0.29 + k * 0.28, 0.13 + k * 0.22);
    }

    for (let i = 0; i < N; i++) {
      const d = seeds[i];
      let rad = d.start + d.vr * age;
      let y = s.surfaceY + d.vy * age - 0.5 * GRAVITY * age * age;
      const falling = d.vy - GRAVITY * age < 0;
      // Droplets that come down inside the mug just rejoin the chai.
      const inside = rad < rimRadius - 0.03;
      let scale = 0.022 * d.size;
      if (inside && falling && y < s.surfaceY) scale = 0;
      // Droplets that hit the outer wall below the rim slide down it.
      if (!inside && y < RIM_Y && rad < rimRadius + 0.02) {
        rad = rimRadius + 0.02;
      }
      if (y < FLOOR_Y) {
        y = FLOOR_Y;
        scale *= 0.6; // little puddle bead on the table
      }
      dummy.position.set(Math.cos(d.angle) * rad, y, Math.sin(d.angle) * rad);
      const stretch = falling ? 1.5 : 1.2; // motion-stretch
      dummy.scale.set(scale, scale * stretch, scale);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, N]} visible={false} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshStandardMaterial ref={mat} color="#B07A45" roughness={0.2} />
    </instancedMesh>
  );
}
