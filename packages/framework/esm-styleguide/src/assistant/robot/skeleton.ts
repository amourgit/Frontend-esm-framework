/**
 * Squelette du robot assistant EGEN.
 *
 * Ce fichier est la SEULE source de vérité sur la structure du corps :
 *  - quelles articulations existent et qui est le parent de qui ;
 *  - où se trouve chaque articulation par rapport à son parent (en mètres) ;
 *  - dans quelles limites chaque articulation peut tourner (en radians).
 *
 * Repère : +y vers le haut, +z vers l'avant (là où le visage regarde), +x vers la
 * gauche du robot (donc à DROITE de l'écran quand on le regarde de face).
 *
 * Conventions de rotation (utiles pour écrire des gestes) :
 *  - épaule / hanche / colonne / cou, rotation x NÉGATIVE : le membre part vers l'avant ;
 *  - coude, rotation x NÉGATIVE : l'avant-bras se plie vers l'avant ;
 *  - genou, rotation x POSITIVE : le tibia se plie vers l'arrière ;
 *  - épaule gauche, rotation z POSITIVE : le bras s'écarte du corps (côté droit : z négative) ;
 *  - tête / cou, rotation y POSITIVE : le regard va vers +x ; rotation x POSITIVE : on baisse la tête.
 * Le côté droit est le miroir exact du côté gauche (y et z de signe opposé).
 */

export type Vec3 = [number, number, number];
export type Side = 'L' | 'R';
export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export type JointName =
  | 'hips'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  | `shoulder${Side}`
  | `elbow${Side}`
  | `wrist${Side}`
  | `hip${Side}`
  | `knee${Side}`
  | `ankle${Side}`
  | `${FingerName}${Side}${1 | 2}`;

export type EulerOrder = 'XYZ' | 'YXZ' | 'ZXY' | 'ZYX' | 'YZX' | 'XZY';

export interface JointSpec {
  parent: JointName | null;
  /** Position de l'articulation dans le repère de son parent, au repos. */
  offset: Vec3;
  /** Butées minimales (x, y, z) en radians. */
  min: Vec3;
  /** Butées maximales (x, y, z) en radians. */
  max: Vec3;
  order: EulerOrder;
}

/** Longueurs des segments (mètres) — partagées par le rendu et le solveur IK. */
export const DIMS = {
  hipsHeight: 0.62,
  upperArm: 0.25,
  foreArm: 0.23,
  thigh: 0.27,
  shin: 0.26,
  ankleHeight: 0.07,
  shoulderX: 0.27,
  hipX: 0.1,
} as const;

export const SIDES: readonly Side[] = ['L', 'R'];
export const FINGERS: readonly FingerName[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];

const PI = Math.PI;
const v = (x: number, y: number, z: number): Vec3 => [x, y, z];

/** Place du doigt sur le bord de la paume (côté gauche ; le droit est le miroir). */
export const FINGER_BASE: Record<FingerName, Vec3> = {
  thumb: v(-0.034, -0.03, 0.022),
  index: v(-0.024, -0.093, 0.004),
  middle: v(-0.008, -0.098, 0.004),
  ring: v(0.008, -0.094, 0.004),
  pinky: v(0.023, -0.087, 0.004),
};
/** Longueur de chaque phalange (m). */
export const FINGER_LENGTH: Record<FingerName, [number, number]> = {
  thumb: [0.034, 0.03],
  index: [0.03, 0.026],
  middle: [0.033, 0.028],
  ring: [0.03, 0.026],
  pinky: [0.024, 0.022],
};

function build(): Record<JointName, JointSpec> {
  const j = {} as Record<JointName, JointSpec>;
  const set = (name: JointName, spec: JointSpec) => {
    j[name] = spec;
  };

  set('hips', { parent: null, offset: v(0, DIMS.hipsHeight, 0), min: v(-0.5, -0.8, -0.4), max: v(0.5, 0.8, 0.4), order: 'YXZ' });
  set('spine', { parent: 'hips', offset: v(0, 0.05, 0), min: v(-0.5, -0.8, -0.4), max: v(0.7, 0.8, 0.4), order: 'YXZ' });
  set('chest', { parent: 'spine', offset: v(0, 0.24, 0), min: v(-0.4, -0.8, -0.4), max: v(0.6, 0.8, 0.4), order: 'YXZ' });
  set('neck', { parent: 'chest', offset: v(0, 0.27, 0), min: v(-0.5, -0.9, -0.4), max: v(0.6, 0.9, 0.4), order: 'YXZ' });
  set('head', { parent: 'neck', offset: v(0, 0.06, 0), min: v(-0.6, -1.0, -0.5), max: v(0.7, 1.0, 0.5), order: 'YXZ' });

  for (const s of SIDES) {
    const m = s === 'L' ? 1 : -1;
    // Les butées de y et z sont calculées pour le côté gauche puis retournées pour le droit.
    const flip = (lo: Vec3, hi: Vec3): { min: Vec3; max: Vec3 } =>
      m === 1
        ? { min: lo, max: hi }
        : { min: v(lo[0], -hi[1], -hi[2]), max: v(hi[0], -lo[1], -lo[2]) };

    set(`shoulder${s}`, {
      parent: 'chest',
      offset: v(m * DIMS.shoulderX, 0.2, 0),
      ...flip(v(-PI, -1.7, -0.9), v(1.0, 1.7, PI)),
      order: 'ZXY',
    });
    set(`elbow${s}`, {
      parent: `shoulder${s}`,
      offset: v(0, -DIMS.upperArm, 0),
      ...flip(v(-2.6, -0.3, -0.1), v(0.05, 0.3, 0.1)),
      order: 'XYZ',
    });
    set(`wrist${s}`, {
      parent: `elbow${s}`,
      offset: v(0, -DIMS.foreArm, 0),
      ...flip(v(-1.1, -1.7, -0.7), v(1.1, 1.7, 0.7)),
      order: 'YXZ',
    });
    set(`hip${s}`, {
      parent: 'hips',
      offset: v(m * DIMS.hipX, -0.02, 0),
      ...flip(v(-1.7, -0.6, -0.4), v(0.6, 0.6, 0.9)),
      order: 'XZY',
    });
    set(`knee${s}`, {
      parent: `hip${s}`,
      offset: v(0, -DIMS.thigh, 0),
      min: v(0, 0, 0),
      max: v(2.5, 0, 0),
      order: 'XYZ',
    });
    set(`ankle${s}`, {
      parent: `knee${s}`,
      offset: v(0, -DIMS.shin, 0),
      ...flip(v(-0.6, -0.3, -0.3), v(0.6, 0.3, 0.3)),
      order: 'XYZ',
    });

    for (const f of FINGERS) {
      const base = FINGER_BASE[f];
      const [l1] = FINGER_LENGTH[f];
      // Les doigts se plient vers la paume (axe z, signe selon le côté).
      const lim = (max: number) => flip(v(-0.2, -0.2, -max), v(0.2, 0.2, 0.1));
      // Le pouce s'écarte de la paume (axe x) en plus de se plier ; les autres doigts non.
      const lim1 = f === 'thumb' ? flip(v(-1.5, -0.5, -1.5), v(0.5, 0.5, 0.1)) : lim(1.5);
      set(`${f}${s}1`, {
        parent: `wrist${s}`,
        offset: v(m * base[0], base[1], base[2]),
        ...lim1,
        order: 'XYZ',
      });
      set(`${f}${s}2`, {
        parent: `${f}${s}1`,
        offset: v(0, -l1, 0),
        ...lim(1.7),
        order: 'XYZ',
      });
    }
  }
  return j;
}

export const JOINTS: Readonly<Record<JointName, JointSpec>> = build();
export const JOINT_NAMES = Object.keys(JOINTS) as JointName[];

/** Table parent → enfants, pour construire l'arbre de rendu. */
export const CHILDREN: Readonly<Record<JointName, JointName[]>> = (() => {
  const c = {} as Record<JointName, JointName[]>;
  for (const n of JOINT_NAMES) c[n] = [];
  for (const n of JOINT_NAMES) {
    const p = JOINTS[n].parent;
    if (p) c[p].push(n);
  }
  return c;
})();

export type Pose = Record<JointName, Vec3>;
export type PartialPose = Partial<Record<JointName, Vec3>>;

/** Pose de repos : bras le long du corps, légèrement écartés, coudes à peine pliés. */
export function createRestPose(): Pose {
  const p = {} as Pose;
  for (const n of JOINT_NAMES) p[n] = [0, 0, 0];
  for (const s of SIDES) {
    const m = s === 'L' ? 1 : -1;
    p[`shoulder${s}`] = [0, 0, m * 0.1];
    p[`elbow${s}`] = [-0.12, 0, 0];
    p[`hip${s}`] = [0, 0, m * 0.03];
    for (const f of FINGERS) {
      const c = f === 'thumb' ? 0.25 : 0.18;
      p[`${f}${s}1`] = [0, 0, -m * c];
      p[`${f}${s}2`] = [0, 0, -m * c * 1.2];
    }
  }
  return p;
}
export const REST_POSE: Readonly<Pose> = createRestPose();

/** Retourne le côté opposé d'un nom d'articulation (`elbowL` → `elbowR`). */
export function mirrorJointName(name: JointName): JointName {
  if (name.includes('L')) return name.replace('L', 'R') as JointName;
  if (name.includes('R')) return name.replace('R', 'L') as JointName;
  return name;
}

/** Miroir d'une pose partielle : échange gauche/droite et inverse y et z. */
export function mirrorPose(pose: PartialPose): PartialPose {
  const out: PartialPose = {};
  for (const [k, val] of Object.entries(pose) as [JointName, Vec3][]) {
    const name = mirrorJointName(k);
    const sided = name !== k;
    out[name] = sided ? [val[0], -val[1], -val[2]] : [val[0], val[1], val[2]];
  }
  return out;
}

export function clampToLimits(name: JointName, value: Vec3): Vec3 {
  const { min, max } = JOINTS[name];
  return [
    Math.min(max[0], Math.max(min[0], value[0])),
    Math.min(max[1], Math.max(min[1], value[1])),
    Math.min(max[2], Math.max(min[2], value[2])),
  ];
}
