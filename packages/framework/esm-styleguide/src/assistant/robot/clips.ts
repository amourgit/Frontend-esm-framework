import { JOINTS, REST_POSE, mirrorJointName, type JointName, type PartialPose, type Side, type Vec3 } from './skeleton.js';
import type { HandShapeName } from './hands.js';

export interface ClipKey {
  /** Instant de la clé, en secondes depuis le début du clip. */
  t: number;
  /** Angles (radians) des articulations concernées. Les autres ne sont pas touchées. */
  pose?: PartialPose;
  /** Forme des mains à partir de cet instant (l'autre côté n'est pas modifié). */
  hands?: Partial<Record<Side, HandShapeName>>;
  /** Hauteur dont le corps est soulevé (mètres) : sauts, sursauts. */
  lift?: number;
}

export interface ClipDef {
  name: string;
  duration: number;
  loop?: boolean;
  fadeIn?: number;
  fadeOut?: number;
  keys: ClipKey[];
}

interface Track {
  times: number[];
  values: Vec3[];
}

export interface CompiledClip {
  name: string;
  duration: number;
  loop: boolean;
  fadeIn: number;
  fadeOut: number;
  tracks: Map<JointName, Track>;
  lift: Track | null;
  hands: { L: { t: number; shape: HandShapeName }[]; R: { t: number; shape: HandShapeName }[] };
}

export interface ClipSample {
  pose: PartialPose;
  hands: Partial<Record<Side, HandShapeName>>;
  lift: number;
}

/** Retourne un clip écrit pour le côté gauche, mais joué avec le côté droit. */
export function mirrorClip(def: ClipDef): ClipDef {
  return {
    ...def,
    keys: def.keys.map((k) => {
      const pose: PartialPose = {};
      for (const [n, v] of Object.entries(k.pose ?? {}) as [JointName, Vec3][]) {
        const m = mirrorJointName(n);
        pose[m] = m !== n ? [v[0], -v[1], -v[2]] : [v[0], v[1], v[2]];
      }
      const hands: Partial<Record<Side, HandShapeName>> = {};
      if (k.hands?.L) hands.R = k.hands.L;
      if (k.hands?.R) hands.L = k.hands.R;
      return { ...k, pose, hands };
    }),
  };
}

export function compileClip(def: ClipDef): CompiledClip {
  const keys = [...def.keys].sort((a, b) => a.t - b.t);
  const tracks = new Map<JointName, Track>();
  const lifts: { t: number; v: number }[] = [];
  const hands = { L: [] as { t: number; shape: HandShapeName }[], R: [] as { t: number; shape: HandShapeName }[] };

  for (const k of keys) {
    for (const [n, v] of Object.entries(k.pose ?? {}) as [JointName, Vec3][]) {
      let tr = tracks.get(n);
      if (!tr) tracks.set(n, (tr = { times: [], values: [] }));
      tr.times.push(k.t);
      tr.values.push(v);
    }
    if (k.lift !== undefined) lifts.push({ t: k.t, v: k.lift });
    if (k.hands?.L) hands.L.push({ t: k.t, shape: k.hands.L });
    if (k.hands?.R) hands.R.push({ t: k.t, shape: k.hands.R });
  }

  // Chaque piste part de la pose de repos et y revient, sauf si l'auteur du clip en a décidé autrement.
  for (const [n, tr] of tracks) {
    const rest = REST_POSE[n];
    if (tr.times[0]! > 0) {
      tr.times.unshift(0);
      tr.values.unshift(def.loop ? tr.values[tr.values.length - 1]! : [...rest]);
    }
    if (tr.times[tr.times.length - 1]! < def.duration) {
      tr.times.push(def.duration);
      tr.values.push(def.loop ? tr.values[0]! : [...rest]);
    }
  }
  let lift: Track | null = null;
  if (lifts.length) {
    const times = lifts.map((l) => l.t);
    const values = lifts.map((l) => [l.v, 0, 0] as Vec3);
    if (times[0]! > 0) {
      times.unshift(0);
      values.unshift([0, 0, 0]);
    }
    if (times[times.length - 1]! < def.duration) {
      times.push(def.duration);
      values.push([0, 0, 0]);
    }
    lift = { times, values };
  }

  return {
    name: def.name,
    duration: def.duration,
    loop: !!def.loop,
    fadeIn: def.fadeIn ?? 0.25,
    fadeOut: def.fadeOut ?? 0.3,
    tracks,
    lift,
    hands,
  };
}

const smooth = (u: number) => u * u * (3 - 2 * u);

function sampleTrack(tr: Track, t: number): Vec3 {
  const { times, values } = tr;
  if (t <= times[0]!) return values[0]!;
  const last = times.length - 1;
  if (t >= times[last]!) return values[last]!;
  let i = 0;
  while (i < last && times[i + 1]! < t) i++;
  const t0 = times[i]!;
  const t1 = times[i + 1]!;
  const u = t1 > t0 ? smooth((t - t0) / (t1 - t0)) : 1;
  const a = values[i]!;
  const b = values[i + 1]!;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

export function sampleClip(clip: CompiledClip, time: number): ClipSample {
  const t = clip.loop ? time % clip.duration : Math.min(time, clip.duration);
  const pose: PartialPose = {};
  for (const [n, tr] of clip.tracks) pose[n] = sampleTrack(tr, t);
  const hands: Partial<Record<Side, HandShapeName>> = {};
  for (const side of ['L', 'R'] as const) {
    let cur: HandShapeName | undefined;
    for (const h of clip.hands[side]) if (h.t <= t) cur = h.shape;
    if (cur) hands[side] = cur;
  }
  return { pose, hands, lift: clip.lift ? sampleTrack(clip.lift, t)[0] : 0 };
}

/** Poids 0..1 d'un clip à l'instant `time` (fondu d'entrée et de sortie). */
export function clipWeight(clip: CompiledClip, time: number, stopping: boolean, stopTime: number): number {
  const fin = clip.fadeIn > 0 ? Math.min(1, time / clip.fadeIn) : 1;
  let fout = 1;
  if (stopping) fout = clip.fadeOut > 0 ? Math.max(0, 1 - (time - stopTime) / clip.fadeOut) : 0;
  else if (!clip.loop && clip.fadeOut > 0) fout = Math.min(1, (clip.duration - time) / clip.fadeOut);
  return smooth(Math.max(0, Math.min(fin, fout)));
}

/** Vérifie qu'un clip ne sort jamais des butées (utile dans les tests). */
export function clipWithinLimits(def: ClipDef): { joint: JointName; t: number; value: Vec3 }[] {
  const bad: { joint: JointName; t: number; value: Vec3 }[] = [];
  for (const k of def.keys) {
    for (const [n, v] of Object.entries(k.pose ?? {}) as [JointName, Vec3][]) {
      const { min, max } = JOINTS[n];
      for (let a = 0; a < 3; a++) {
        if (v[a]! < min[a]! - 1e-6 || v[a]! > max[a]! + 1e-6) bad.push({ joint: n, t: k.t, value: v });
      }
    }
  }
  return bad;
}
