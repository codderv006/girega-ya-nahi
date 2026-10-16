"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { VesselId } from "@/lib/config";
import type { SceneState } from "./types";
import { Splash } from "./Splash";

export const CUP_TOP = 0.32;
export const CUP_BOTTOM = -0.62;
export const RIM_R = 0.6;
const BASE_R = 0.52;
const WALL = 0.045;

const VESSEL_LOOK: Record<VesselId, { color: string; roughness: number; metalness: number; handle: boolean; band?: string }> = {
  mug: { color: "#F7F5F0", roughness: 0.22, metalness: 0, handle: true },
  kulhad: { color: "#B3562F", roughness: 0.95, metalness: 0, handle: false },
  steel: { color: "#D5DADF", roughness: 0.22, metalness: 0.95, handle: false },
  paper: { color: "#F4EFE6", roughness: 0.8, metalness: 0, handle: false, band: "#D7263D" },
};

const radiusAt = (y: number) => BASE_R + ((y - CUP_BOTTOM) / (CUP_TOP - CUP_BOTTOM)) * (RIM_R - BASE_R);

function softDot(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,0.9)");
  grd.addColorStop(0.4, "rgba(255,255,255,0.35)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const STEAM_N = 60;

export function ChaiCup({ state }: { state: React.RefObject<SceneState> }) {
  const cupMat = useRef<THREE.MeshStandardMaterial>(null);
  const handle = useRef<THREE.Mesh>(null);
  const band = useRef<THREE.Mesh>(null);
  const bandMat = useRef<THREE.MeshStandardMaterial>(null);
  const chaiMat = useRef<THREE.MeshStandardMaterial>(null);
  const surface = useRef<THREE.Mesh>(null);
  const steam = useRef<THREE.Points>(null);
  const steamMat = useRef<THREE.PointsMaterial>(null);
  const lastVessel = useRef<VesselId | null>(null);

  const cupGeo = useMemo(() => {
    // Outer wall up, rounded lip, inner wall down.
    const pts = [
      new THREE.Vector2(0, CUP_BOTTOM),
      new THREE.Vector2(BASE_R - 0.04, CUP_BOTTOM),
      new THREE.Vector2(BASE_R, CUP_BOTTOM + 0.04),
      new THREE.Vector2(RIM_R, CUP_TOP),
      new THREE.Vector2(RIM_R - WALL / 2, CUP_TOP + 0.018),
      new THREE.Vector2(RIM_R - WALL, CUP_TOP),
      new THREE.Vector2(BASE_R - WALL, CUP_BOTTOM + WALL + 0.04),
      new THREE.Vector2(0, CUP_BOTTOM + WALL),
    ];
    return new THREE.LatheGeometry(pts, 64);
  }, []);

  const handleGeo = useMemo(() => {
    // Half torus on the +x side, slightly squashed like a real mug handle.
    const g = new THREE.TorusGeometry(0.25, 0.05, 16, 40, Math.PI);
    g.rotateZ(-Math.PI / 2);
    g.scale(0.85, 1, 1);
    return g;
  }, []);

  const bandGeo = useMemo(() => {
    const y0 = -0.3, y1 = -0.08;
    return new THREE.LatheGeometry([new THREE.Vector2(radiusAt(y0) + 0.003, y0), new THREE.Vector2(radiusAt(y1) + 0.003, y1)], 64);
  }, []);

  const surfaceGeo = useMemo(() => {
    const g = new THREE.RingGeometry(0.001, 1, 48, 10);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const basePos = useMemo(() => Float32Array.from(surfaceGeo.attributes.position.array), [surfaceGeo]);

  const { steamGeo, seeds } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(STEAM_N * 3), 3));
    const seeds = Array.from({ length: STEAM_N }, (_, i) => ({ phase: (i * 0.6180339) % 1, x: Math.sin(i * 12.9) * 0.28, z: Math.cos(i * 7.3) * 0.28, speed: 0.6 + ((i * 0.37) % 0.5) }));
    return { steamGeo: g, seeds };
  }, []);
  const dotTex = useMemo(() => (typeof document !== "undefined" ? softDot() : null), []);

  useFrame((frame) => {
    const s = state.current;
    if (!s) return;
    const t = frame.clock.elapsedTime;

    if (lastVessel.current !== s.vessel && cupMat.current) {
      const look = VESSEL_LOOK[s.vessel];
      cupMat.current.color.set(look.color);
      cupMat.current.roughness = look.roughness;
      cupMat.current.metalness = look.metalness;
      if (handle.current) handle.current.visible = look.handle;
      if (band.current && bandMat.current) {
        band.current.visible = !!look.band;
        if (look.band) bandMat.current.color.set(look.band);
      }
      lastVessel.current = s.vessel;
    }

    if (chaiMat.current) {
      const m = s.milkiness;
      chaiMat.current.color.setRGB(0.5 + m * 0.3, 0.29 + m * 0.28, 0.13 + m * 0.22);
    }

    // Liquid surface: idle shimmer + a decaying ripple ring after impact.
    if (surface.current) {
      const r = radiusAt(s.surfaceY) - WALL - 0.005;
      surface.current.position.y = s.surfaceY;
      surface.current.scale.set(r, 1, r);
      const pos = surface.current.geometry.attributes.position as THREE.BufferAttribute;
      const age = t - s.ripple;
      const amp = age >= 0 && age < 3 ? 0.03 * Math.exp(-age * 1.6) : 0;
      for (let i = 0; i < pos.count; i++) {
        const x = basePos[i * 3], z = basePos[i * 3 + 2];
        const d = Math.hypot(x, z);
        const y = Math.sin(d * 9 - t * 2) * 0.003 + amp * Math.sin(d * 22 - age * 14) * Math.exp(-Math.abs(d - age * 0.6) * 3);
        pos.setY(i, y / r);
      }
      pos.needsUpdate = true;
      surface.current.geometry.computeVertexNormals();
    }

    // Steam rises and fades; density follows heat.
    if (steam.current && steamMat.current) {
      const pos = steam.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < STEAM_N; i++) {
        const sd = seeds[i];
        const p = (sd.phase + t * 0.18 * sd.speed) % 1;
        pos.setXYZ(i, sd.x + Math.sin(t * 0.8 + i) * 0.08 * p, s.surfaceY + 0.05 + p * 1.4, sd.z + Math.cos(t * 0.7 + i) * 0.06 * p);
      }
      pos.needsUpdate = true;
      steamMat.current.opacity = 0.05 + s.heat * 0.3;
      steamMat.current.size = 0.22 + s.heat * 0.26;
    }
  });

  return (
    <group rotation={[0, -0.6, 0]}>
      <mesh geometry={cupGeo}>
        <meshStandardMaterial ref={cupMat} color="#F7F5F0" roughness={0.22} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={handle} geometry={handleGeo} position={[radiusAt(-0.14) - 0.03, -0.14, 0]}>
        <meshStandardMaterial color="#F7F5F0" roughness={0.22} />
      </mesh>
      <mesh ref={band} geometry={bandGeo} visible={false}>
        <meshStandardMaterial ref={bandMat} color="#D7263D" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={surface} geometry={surfaceGeo}>
        <meshStandardMaterial ref={chaiMat} color="#A0642B" roughness={0.3} />
      </mesh>
      <Splash state={state} rimRadius={RIM_R} />
      {dotTex && (
        <points ref={steam} geometry={steamGeo}>
          <pointsMaterial ref={steamMat} map={dotTex} transparent depthWrite={false} color="#cdb89e" size={0.35} sizeAttenuation opacity={0.3} />
        </points>
      )}
    </group>
  );
}
