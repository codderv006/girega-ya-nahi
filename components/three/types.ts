import type { VesselId } from "@/lib/config";

/** Mutable scene controls, read every frame so scroll/sliders never re-render React. */
export interface SceneState {
  heat: number; // 0..1 steam intensity
  dip: number; // 0 = above cup, 1 = dunked
  lift: number; // 0..1 pull the dunked biscuit back out
  wet: number; // 0..1 soak darkness
  fall: number; // 0..1 wet piece detaching and dropping into the cup
  spin: boolean;
  tremble: boolean;
  snappy: boolean; // follow targets tightly (scroll scrubbing)
  surfaceY: number;
  milkiness: number;
  vessel: VesselId;
  ripple: number; // clock time of the last ripple
  splash: number; // clock time of the last splash (piece hits the chai)
}

export const defaultSceneState = (over: Partial<SceneState> = {}): SceneState => ({
  heat: 0.6,
  dip: 0,
  lift: 0,
  wet: 0,
  fall: 0,
  spin: true,
  tremble: false,
  snappy: false,
  surfaceY: 0.18,
  milkiness: 0.55,
  vessel: "mug",
  ripple: -10,
  splash: -10,
  ...over,
});
