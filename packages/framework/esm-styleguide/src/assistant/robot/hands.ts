import { FINGERS, type PartialPose, type Side, type Vec3 } from './skeleton.js';

/** Fermeture de chaque doigt, de 0 (tendu) à 1 (replié) : pouce, index, majeur, annulaire, auriculaire. */
export type Curl5 = [number, number, number, number, number];

export interface HandShape {
  curl: Curl5;
  /** Écartement du pouce loin de la paume, en radians (0 = collé à la main). */
  thumbOut: number;
}

export const HAND_SHAPES = {
  /** Main détendue : doigts légèrement fléchis, comme au repos. */
  relaxed: { curl: [0.22, 0.2, 0.22, 0.25, 0.28], thumbOut: 0.1 },
  /** Main ouverte, doigts tendus. */
  open: { curl: [0.02, 0.02, 0.02, 0.02, 0.04], thumbOut: 0.45 },
  /** Main à plat, doigts serrés (paume vers l'interlocuteur). */
  flat: { curl: [0.05, 0, 0, 0, 0], thumbOut: 0.1 },
  /** Poing fermé. */
  fist: { curl: [0.85, 1, 1, 1, 1], thumbOut: 0 },
  /** Index tendu, les autres doigts repliés. */
  point: { curl: [0.9, 0, 1, 1, 1], thumbOut: 0.1 },
  /** Pouce levé : poing avec le pouce écarté. */
  thumbsUp: { curl: [0, 1, 1, 1, 1], thumbOut: 1.25 },
  /** Pince pouce–index. */
  pinch: { curl: [0.45, 0.55, 0.3, 0.3, 0.3], thumbOut: 0.35 },
  /** Main légèrement creusée, pour tenir ou présenter. */
  cup: { curl: [0.3, 0.38, 0.4, 0.42, 0.45], thumbOut: 0.5 },
} as const satisfies Record<string, HandShape>;

export type HandShapeName = keyof typeof HAND_SHAPES;

const PROXIMAL = [0.9, 1.35, 1.4, 1.4, 1.35];
const DISTAL = [0.9, 1.5, 1.55, 1.55, 1.5];

/** Convertit une forme de main (déjà lissée) en angles d'articulations pour un côté. */
export function handPose(side: Side, curl: Curl5, thumbOut: number): PartialPose {
  const m = side === 'L' ? 1 : -1;
  const out: PartialPose = {};
  FINGERS.forEach((f, i) => {
    const c = Math.min(1, Math.max(0, curl[i]!));
    const a: Vec3 = [0, 0, -m * c * PROXIMAL[i]!];
    const b: Vec3 = [0, 0, -m * c * DISTAL[i]!];
    if (f === 'thumb') a[0] = -thumbOut;
    out[`${f}${side}1`] = a;
    out[`${f}${side}2`] = b;
  });
  return out;
}

export function resolveShape(shape: HandShapeName | HandShape): HandShape {
  return typeof shape === 'string' ? HAND_SHAPES[shape] : shape;
}
