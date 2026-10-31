import { mirrorClip, type ClipDef, type ClipKey } from './clips.js';
import type { Side } from './skeleton.js';

/**
 * Bibliothèque de gestes.
 *
 * Chaque geste est écrit pour le bras GAUCHE (côté +x). `play('wave', { side: 'R' })`
 * le rejoue avec le bras droit grâce à `mirrorClip`. Les gestes à deux bras (`sided: false`)
 * contiennent déjà les deux côtés.
 *
 * Pour ajouter un geste : décrire quelques poses clés (angles en radians, voir skeleton.ts)
 * et l'enregistrer dans `GESTURE_LIBRARY` — rien d'autre à modifier.
 */

export type GestureName =
  | 'wave'
  | 'greet'
  | 'nod'
  | 'shakeHead'
  | 'tiltHead'
  | 'point'
  | 'thumbsUp'
  | 'openArms'
  | 'shrug'
  | 'think'
  | 'clap'
  | 'bow'
  | 'celebrate'
  | 'present'
  | 'talkA'
  | 'talkB'
  | 'talkC';

export interface GestureEntry {
  def: ClipDef;
  /** `true` : écrit pour un seul bras, peut être joué à gauche ou à droite. */
  sided: boolean;
}

/** Fusionne un clip gauche et son miroir pour obtenir un geste à deux bras symétriques. */
function bilateral(def: ClipDef): ClipDef {
  const m = mirrorClip(def);
  return {
    ...def,
    keys: def.keys.map((k, i) => ({
      ...k,
      pose: { ...(k.pose ?? {}), ...(m.keys[i]!.pose ?? {}) },
      hands: { ...(k.hands ?? {}), ...(m.keys[i]!.hands ?? {}) },
    })),
  };
}

/** Génère des clés qui alternent entre deux poses (balancements, applaudissements…). */
function oscillate(
  start: number,
  period: number,
  cycles: number,
  a: ClipKey['pose'],
  b: ClipKey['pose'],
): ClipKey[] {
  const keys: ClipKey[] = [];
  for (let i = 0; i < cycles * 2; i++) keys.push({ t: start + (i * period) / 2, pose: i % 2 === 0 ? a : b });
  return keys;
}

const wave: ClipDef = {
  name: 'wave',
  duration: 2.1,
  keys: [
    {
      t: 0.4,
      pose: {
        shoulderL: [-0.1, 1.45, 1.1],
        elbowL: [-1.45, 0, 0],
        wristL: [0, 0, 0],
        head: [0, 0, -0.1],
        chest: [0, 0, -0.04],
      },
      hands: { L: 'open' },
    },
    ...oscillate(
      0.4,
      0.4,
      3,
      { shoulderL: [-0.1, 1.45, 1.1], elbowL: [-1.15, 0, 0], wristL: [0, 0, 0.3] },
      { shoulderL: [-0.1, 1.45, 1.1], elbowL: [-1.85, 0, 0], wristL: [0, 0, -0.3] },
    ).slice(1),
    { t: 1.75, pose: { shoulderL: [-0.1, 1.45, 1.1], elbowL: [-1.45, 0, 0], head: [0, 0, -0.1] } },
  ],
};

const greet: ClipDef = {
  ...wave,
  name: 'greet',
  keys: [
    ...wave.keys,
    { t: 0.3, pose: { head: [0.12, 0.25, -0.08], neck: [0.05, 0.1, 0] } },
    { t: 1.7, pose: { head: [0.12, 0.25, -0.08], neck: [0.05, 0.1, 0] } },
  ],
};

const nod: ClipDef = {
  name: 'nod',
  duration: 1.1,
  fadeIn: 0.1,
  fadeOut: 0.2,
  keys: [
    { t: 0.18, pose: { head: [0.32, 0, 0], neck: [0.1, 0, 0] } },
    { t: 0.36, pose: { head: [-0.04, 0, 0], neck: [0, 0, 0] } },
    { t: 0.54, pose: { head: [0.32, 0, 0], neck: [0.1, 0, 0] } },
    { t: 0.76, pose: { head: [0, 0, 0], neck: [0, 0, 0] } },
  ],
};

const shakeHead: ClipDef = {
  name: 'shakeHead',
  duration: 1.3,
  fadeIn: 0.1,
  fadeOut: 0.2,
  keys: [
    { t: 0.16, pose: { head: [0, 0.42, 0], neck: [0, 0.14, 0] } },
    { t: 0.4, pose: { head: [0, -0.42, 0], neck: [0, -0.14, 0] } },
    { t: 0.64, pose: { head: [0, 0.38, 0], neck: [0, 0.12, 0] } },
    { t: 0.88, pose: { head: [0, -0.3, 0], neck: [0, -0.1, 0] } },
    { t: 1.1, pose: { head: [0, 0, 0], neck: [0, 0, 0] } },
  ],
};

const tiltHead: ClipDef = {
  name: 'tiltHead',
  duration: 1.8,
  keys: [
    { t: 0.4, pose: { head: [-0.05, 0.12, -0.3], neck: [0, 0.05, -0.1] } },
    { t: 1.4, pose: { head: [-0.05, 0.12, -0.3], neck: [0, 0.05, -0.1] } },
  ],
};

const point: ClipDef = {
  name: 'point',
  duration: 2.2,
  keys: [
    {
      t: 0.45,
      pose: {
        shoulderL: [-1.4, 0.15, 0.2],
        elbowL: [-0.12, 0, 0],
        wristL: [0, -0.2, 0],
        chest: [0, -0.12, 0],
        head: [0, -0.15, 0],
      },
      hands: { L: 'point' },
    },
    {
      t: 1.7,
      pose: {
        shoulderL: [-1.4, 0.15, 0.2],
        elbowL: [-0.12, 0, 0],
        wristL: [0, -0.2, 0],
        chest: [0, -0.12, 0],
        head: [0, -0.15, 0],
      },
    },
  ],
};

const thumbsUp: ClipDef = {
  name: 'thumbsUp',
  duration: 2,
  keys: [
    {
      t: 0.45,
      pose: {
        shoulderL: [-0.84, -0.14, 0.34],
        elbowL: [-1.56, 0, 0],
        wristL: [0, 0, 0],
        head: [-0.05, 0, 0.08],
      },
      hands: { L: 'thumbsUp' },
    },
    {
      t: 1.5,
      pose: {
        shoulderL: [-0.84, -0.14, 0.34],
        elbowL: [-1.56, 0, 0],
        wristL: [0, 0, 0],
        head: [-0.05, 0, 0.08],
      },
    },
  ],
};

const openArms: ClipDef = bilateral({
  name: 'openArms',
  duration: 2.6,
  keys: [
    {
      t: 0.6,
      pose: {
        shoulderL: [-0.35, 0.9, 1.05],
        elbowL: [-0.55, 0, 0],
        wristL: [0, 0, 0],
        head: [-0.12, 0, 0],
        chest: [-0.1, 0, 0],
      },
      hands: { L: 'open' },
    },
    {
      t: 2.0,
      pose: {
        shoulderL: [-0.35, 0.9, 1.05],
        elbowL: [-0.55, 0, 0],
        wristL: [0, 0, 0],
        head: [-0.12, 0, 0],
        chest: [-0.1, 0, 0],
      },
    },
  ],
});

const shrug: ClipDef = bilateral({
  name: 'shrug',
  duration: 1.9,
  keys: [
    {
      t: 0.35,
      pose: {
        shoulderL: [-0.25, 1.0, 0.45],
        elbowL: [-1.25, 0, 0],
        wristL: [0, 0.3, 0],
        head: [0, 0, 0.14],
        neck: [-0.08, 0, 0.05],
        chest: [-0.05, 0, 0],
      },
      hands: { L: 'open' },
    },
    {
      t: 1.3,
      pose: {
        shoulderL: [-0.25, 1.0, 0.45],
        elbowL: [-1.25, 0, 0],
        wristL: [0, 0.3, 0],
        head: [0, 0, 0.14],
        neck: [-0.08, 0, 0.05],
      },
    },
  ],
});

const think: ClipDef = {
  name: 'think',
  duration: 3.2,
  keys: [
    {
      t: 0.6,
      // Main près du menton (angles calculés par IK).
      pose: {
        shoulderL: [-0.68, -1.05, -0.57],
        elbowL: [-1.87, 0, 0],
        wristL: [-0.25, 0, 0],
        head: [0.1, -0.18, -0.12],
        neck: [0.05, 0, 0],
        chest: [0.04, 0, 0],
      },
      hands: { L: 'relaxed' },
    },
    {
      t: 2.6,
      pose: {
        shoulderL: [-0.68, -1.05, -0.57],
        elbowL: [-1.87, 0, 0],
        wristL: [-0.25, 0, 0],
        head: [0.1, -0.18, -0.12],
        neck: [0.05, 0, 0],
      },
    },
  ],
};

const clap: ClipDef = bilateral({
  name: 'clap',
  duration: 1.9,
  // Positions calculées par IK : mains écartées (open) puis jointes devant la poitrine (closed).
  keys: [
    { t: 0.3, pose: { shoulderL: [-0.52, -0.4, 0.18], elbowL: [-1.64, 0, 0], head: [0.04, 0, 0] }, hands: { L: 'flat' } },
    ...oscillate(
      0.3,
      0.3,
      4,
      { shoulderL: [-0.52, -0.4, 0.18], elbowL: [-1.64, 0, 0] },
      { shoulderL: [-0.69, -0.97, -0.47], elbowL: [-1.06, 0, 0] },
    ).slice(1),
    { t: 1.6, pose: { shoulderL: [-0.52, -0.4, 0.18], elbowL: [-1.64, 0, 0] } },
  ],
});

const bow: ClipDef = {
  name: 'bow',
  duration: 2.4,
  keys: [
    {
      t: 0.8,
      pose: {
        spine: [0.45, 0, 0],
        chest: [0.18, 0, 0],
        neck: [0.18, 0, 0],
        head: [0.1, 0, 0],
        shoulderL: [-0.3, 0.2, 0.15],
        shoulderR: [-0.3, -0.2, -0.15],
        hipL: [-0.25, 0, 0.03],
        hipR: [-0.25, 0, -0.03],
      },
    },
    {
      t: 1.4,
      pose: {
        spine: [0.45, 0, 0],
        chest: [0.18, 0, 0],
        neck: [0.18, 0, 0],
        head: [0.1, 0, 0],
        shoulderL: [-0.3, 0.2, 0.15],
        shoulderR: [-0.3, -0.2, -0.15],
        hipL: [-0.25, 0, 0.03],
        hipR: [-0.25, 0, -0.03],
      },
    },
  ],
};

const celebrate: ClipDef = bilateral({
  name: 'celebrate',
  duration: 2.2,
  keys: [
    {
      t: 0.3,
      pose: { shoulderL: [-0.2, 0.3, 2.45], elbowL: [-0.35, 0, 0], head: [-0.15, 0, 0], chest: [-0.12, 0, 0] },
      hands: { L: 'open' },
      lift: 0,
    },
    { t: 0.55, pose: { shoulderL: [-0.2, 0.3, 2.6], elbowL: [-0.25, 0, 0], hipL: [0.1, 0, 0.03] }, lift: 0.14 },
    { t: 0.85, pose: { shoulderL: [-0.2, 0.3, 2.45], elbowL: [-0.35, 0, 0] }, lift: 0 },
    { t: 1.1, pose: { shoulderL: [-0.2, 0.3, 2.6], elbowL: [-0.25, 0, 0] }, lift: 0.14 },
    { t: 1.4, pose: { shoulderL: [-0.2, 0.3, 2.45], elbowL: [-0.35, 0, 0] }, lift: 0 },
    { t: 1.8, pose: { shoulderL: [-0.2, 0.3, 2.45], elbowL: [-0.35, 0, 0] }, lift: 0 },
  ],
});

const present: ClipDef = {
  name: 'present',
  duration: 2.2,
  keys: [
    {
      t: 0.5,
      pose: {
        shoulderL: [-0.65, 0.95, 0.65],
        elbowL: [-1.0, 0, 0],
        wristL: [0.1, 0.4, 0],
        chest: [0, -0.1, 0],
        head: [0, -0.12, 0],
      },
      hands: { L: 'cup' },
    },
    {
      t: 1.7,
      pose: {
        shoulderL: [-0.65, 0.95, 0.65],
        elbowL: [-1.0, 0, 0],
        wristL: [0.1, 0.4, 0],
        chest: [0, -0.1, 0],
        head: [0, -0.12, 0],
      },
    },
  ],
};

// Petits gestes d'accompagnement de la parole : courts, discrets, enchaînés au hasard.
const talkA: ClipDef = {
  name: 'talkA',
  duration: 1.1,
  fadeIn: 0.2,
  fadeOut: 0.3,
  keys: [
    { t: 0.3, pose: { shoulderL: [-0.55, 0.5, 0.3], elbowL: [-1.1, 0, 0], head: [0.05, 0.06, 0] }, hands: { L: 'relaxed' } },
    { t: 0.6, pose: { shoulderL: [-0.6, 0.5, 0.3], elbowL: [-0.9, 0, 0], head: [-0.03, 0.06, 0] } },
  ],
};
const talkB: ClipDef = {
  name: 'talkB',
  duration: 1.2,
  fadeIn: 0.2,
  fadeOut: 0.3,
  keys: [
    { t: 0.35, pose: { shoulderL: [-0.5, 0.8, 0.5], elbowL: [-1.0, 0, 0], wristL: [0.1, 0.3, 0], head: [0, -0.07, 0.05] }, hands: { L: 'cup' } },
    { t: 0.7, pose: { shoulderL: [-0.5, 0.8, 0.55], elbowL: [-0.8, 0, 0], wristL: [0.1, 0.3, 0] } },
  ],
};
const talkC: ClipDef = {
  name: 'talkC',
  duration: 1.2,
  fadeIn: 0.2,
  fadeOut: 0.3,
  keys: [
    {
      t: 0.3,
      pose: {
        shoulderL: [-0.45, 0.4, 0.25],
        elbowL: [-1.2, 0, 0],
        shoulderR: [-0.45, -0.4, -0.25],
        elbowR: [-1.2, 0, 0],
        head: [0.04, 0, 0],
      },
      hands: { L: 'relaxed', R: 'relaxed' },
    },
    {
      t: 0.65,
      pose: {
        shoulderL: [-0.5, 0.4, 0.35],
        elbowL: [-1.0, 0, 0],
        shoulderR: [-0.5, -0.4, -0.35],
        elbowR: [-1.0, 0, 0],
        head: [-0.03, 0, 0],
      },
    },
  ],
};

export const GESTURE_LIBRARY: Record<GestureName, GestureEntry> = {
  wave: { def: wave, sided: true },
  greet: { def: greet, sided: true },
  nod: { def: nod, sided: false },
  shakeHead: { def: shakeHead, sided: false },
  tiltHead: { def: tiltHead, sided: false },
  point: { def: point, sided: true },
  thumbsUp: { def: thumbsUp, sided: true },
  openArms: { def: openArms, sided: false },
  shrug: { def: shrug, sided: false },
  think: { def: think, sided: true },
  clap: { def: clap, sided: false },
  bow: { def: bow, sided: false },
  celebrate: { def: celebrate, sided: false },
  present: { def: present, sided: true },
  talkA: { def: talkA, sided: true },
  talkB: { def: talkB, sided: true },
  talkC: { def: talkC, sided: false },
};

export const GESTURE_NAMES = Object.keys(GESTURE_LIBRARY) as GestureName[];
export const TALK_GESTURES: GestureName[] = ['talkA', 'talkB', 'talkC'];

export function resolveGesture(name: GestureName, side: Side = 'L'): ClipDef {
  const entry = GESTURE_LIBRARY[name];
  return entry.sided && side === 'R' ? mirrorClip(entry.def) : entry.def;
}
