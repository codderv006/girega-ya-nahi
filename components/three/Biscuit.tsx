"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { makeBiscuitTextures } from "./biscuitTexture";
import type { SceneState } from "./types";

export const BISCUIT_W = 0.84;
export const BISCUIT_H = 1.12;
const DEPTH = 0.09;
const CORNER = 0.05;

/** Jagged break line across the biscuit at local height y. */
function breakLine(y: number): [number, number][] {
  const pts: [number, number][] = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const x = BISCUIT_W / 2 - (i / n) * BISCUIT_W; // right → left
    const jag = i === 0 || i === n ? 0 : (i % 2 ? 1 : -1) * (0.025 + ((i * 37) % 5) * 0.006);
    pts.push([x, y + jag]);
  }
  return pts;
}

function piece(breakY: number, part: "top" | "bottom"): THREE.ExtrudeGeometry {
  const w = BISCUIT_W / 2;
  const h = BISCUIT_H / 2;
  const r = CORNER;
  const s = new THREE.Shape();
  if (part === "top") {
    s.moveTo(-w, breakY);
    s.lineTo(-w, h - r);
    s.quadraticCurveTo(-w, h, -w + r, h);
    s.lineTo(w - r, h);
    s.quadraticCurveTo(w, h, w, h - r);
    s.lineTo(w, breakY);
  } else {
    s.moveTo(-w, breakY);
    s.lineTo(-w, -h + r);
    s.quadraticCurveTo(-w, -h, -w + r, -h);
    s.lineTo(w - r, -h);
    s.quadraticCurveTo(w, -h, w, -h + r);
    s.lineTo(w, breakY);
  }
  for (const [x, y] of breakLine(breakY).slice(1)) s.lineTo(x, y);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.014,
    bevelSegments: 2,
    curveSegments: 4,
  });
  g.translate(0, 0, -DEPTH / 2);
  return g;
}

type WetUniforms = { uWetLevel: { value: number }; uWet: { value: number } };

/** Darkens fragments below a local-space waterline (chai soak). */
function addSoak(m: THREE.MeshStandardMaterial, uniforms: WetUniforms) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWetLevel = uniforms.uWetLevel;
    shader.uniforms.uWet = uniforms.uWet;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vLocalY;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocalY = position.y;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vLocalY;\nuniform float uWetLevel;\nuniform float uWet;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float soak = smoothstep(uWetLevel + 0.06, uWetLevel - 0.04, vLocalY) * uWet;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.50, 0.31, 0.14), soak * 0.7);`,
      );
  };
  return m;
}

export function Biscuit({ state, dunkDepth }: { state: React.RefObject<SceneState>; dunkDepth: number }) {
  const group = useRef<THREE.Group>(null);
  const bottom = useRef<THREE.Group>(null);
  const breakY = -BISCUIT_H / 2 + dunkDepth * BISCUIT_H;

  const uniforms = useMemo<WetUniforms>(() => ({ uWetLevel: { value: breakY }, uWet: { value: 0 } }), [breakY]);

  const textures = useMemo(() => {
    const t = makeBiscuitTextures();
    // ExtrudeGeometry cap UVs are raw shape coordinates; map them onto 0..1.
    for (const tex of [t.map, t.bump]) {
      tex.repeat.set(1 / BISCUIT_W, 1 / BISCUIT_H);
      tex.offset.set(0.5, 0.5);
    }
    return t;
  }, []);

  const materials = useMemo(() => {
    const face = addSoak(new THREE.MeshStandardMaterial({ map: textures.map, bumpMap: textures.bump, bumpScale: 2.5, roughness: 0.9 }), uniforms);
    const side = addSoak(new THREE.MeshStandardMaterial({ color: "#CF9652", roughness: 0.95 }), uniforms);
    return [face, side]; // ExtrudeGeometry groups: 0 = caps, 1 = sides
  }, [textures, uniforms]);

  const geos = useMemo(() => ({ top: piece(breakY, "top"), bottom: piece(breakY, "bottom") }), [breakY]);

  useEffect(
    () => () => {
      geos.top.dispose();
      geos.bottom.dispose();
    },
    [geos],
  );

  const smooth = useRef({ dip: 0, wet: 0, fall: 0, lift: 0 });
  const impact = useRef(true);

  useFrame((frame, dt) => {
    const s = state.current;
    if (!s || !group.current || !bottom.current) return;
    const k = 1 - Math.exp(-dt * (s.snappy ? 30 : 6));
    const sm = smooth.current;
    sm.dip += (s.dip - sm.dip) * k;
    sm.wet += (s.wet - sm.wet) * k;
    sm.fall += (s.fall - sm.fall) * k;
    sm.lift += (s.lift - sm.lift) * k;

    const surfaceY = s.surfaceY;
    const above = surfaceY + BISCUIT_H / 2 + 0.45;
    const dipped = surfaceY + BISCUIT_H / 2 - dunkDepth * BISCUIT_H;
    // Pulled out = a little lower than the start, so the wet end hangs just above the chai.
    const pulled = surfaceY + BISCUIT_H / 2 + 0.22;
    const dunkY = above + (dipped - above) * sm.dip;
    const groupY = dunkY + (pulled - dunkY) * sm.lift;
    group.current.position.y = groupY;
    const t = frame.clock.elapsedTime;
    group.current.rotation.y = s.spin ? Math.sin(t * 0.6) * 0.45 + t * 0.12 * (1 - sm.dip) : -0.35 + Math.sin(t * 0.8) * 0.06;
    group.current.rotation.z = -0.08 + Math.sin(t * 1.3) * 0.015 * (s.tremble ? 3 : 1);
    group.current.position.x = s.tremble ? Math.sin(t * 40) * 0.005 : 0;

    uniforms.uWet.value = sm.wet;

    // The wet bottom piece snaps at the crack, tips a little and drops straight
    // into the cup, sinking just far enough to vanish under the chai.
    const f = sm.fall;
    const drop = groupY - dipped + dunkDepth * BISCUIT_H + 0.12;
    const fallen = f * f * drop;
    bottom.current.position.y = breakY - fallen;
    bottom.current.position.x = f * 0.03;
    bottom.current.rotation.z = Math.min(1, f * 1.6) * 0.25;
    bottom.current.visible = f < 0.97;

    // Splash the moment the piece's lower edge hits the chai.
    const pieceBottom = groupY - BISCUIT_H / 2 - fallen;
    const below = pieceBottom < surfaceY;
    if (below && !impact.current && f > 0.05) {
      s.splash = t;
      s.ripple = t;
    }
    impact.current = below;
  });

  return (
    <group ref={group}>
      <mesh geometry={geos.top} material={materials} />
      {/* Pivot sits on the break line so rotation hinges at the crack */}
      <group ref={bottom} position={[0, breakY, 0]}>
        <mesh geometry={geos.bottom} material={materials} position={[0, -breakY, 0]} />
      </group>
    </group>
  );
}
