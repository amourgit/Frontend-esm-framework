import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { DIMS, type Side, type Vec3 } from './skeleton.js';

export interface ArmIKInput {
  /** Position de l'épaule dans le repère du torse (parent de l'épaule). */
  shoulder: Vector3;
  /** Point à atteindre, dans le même repère. */
  target: Vector3;
  side: Side;
  upper?: number;
  fore?: number;
}

export interface ArmIKResult {
  /** Rotation à appliquer à l'articulation d'épaule. */
  shoulder: Quaternion;
  /** Même rotation, en angles d'Euler (ordre ZXY) — pour inspection ou tests. */
  shoulderEuler: Vec3;
  /** Rotation x du coude (≤ 0 : l'avant-bras se plie vers l'avant). */
  elbowX: number;
  /** Le point est-il à portée de bras (sinon le bras se tend dans sa direction) ? */
  reachable: boolean;
  /** Position finale du poignet dans le repère du torse. */
  wrist: Vector3;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Cinématique inverse analytique d'un bras à deux segments.
 *
 * Idée : le triangle épaule–coude–poignet est entièrement déterminé par ses trois côtés
 * (longueur du bras, de l'avant-bras, distance épaule→cible). La loi des cosinus donne
 * l'angle du coude et l'écart entre la direction de la cible et celle du bras. Il reste
 * un degré de liberté (de quel côté pointe le coude) : on le fixe avec un « pôle »
 * orienté vers le bas et vers l'extérieur, ce qui donne un coude naturel.
 */
export function solveArmIK({ shoulder, target, side, upper = DIMS.upperArm, fore = DIMS.foreArm }: ArmIKInput): ArmIKResult {
  const m = side === 'L' ? 1 : -1;
  const toTarget = target.clone().sub(shoulder);
  const rawDist = toTarget.length();
  const dir = rawDist > 1e-6 ? toTarget.clone().divideScalar(rawDist) : new Vector3(0, 0, 1);

  const dMax = (upper + fore) * 0.999;
  const dMin = Math.abs(upper - fore) + 0.03;
  const d = clamp(rawDist, dMin, dMax);
  const reachable = rawDist <= dMax && rawDist >= dMin;

  // Coude : loi des cosinus.
  const cosInterior = clamp((upper * upper + fore * fore - d * d) / (2 * upper * fore), -1, 1);
  const flex = Math.PI - Math.acos(cosInterior);

  // Écart entre la direction de la cible et celle du bras.
  const cosBeta = clamp((upper * upper + d * d - fore * fore) / (2 * upper * d), -1, 1);
  const beta = Math.acos(cosBeta);

  // Pôle : le coude pointe vers le bas, un peu vers l'extérieur et vers l'arrière.
  const pole = new Vector3(m * 0.5, -1, -0.25).normalize();
  let axis = new Vector3().crossVectors(dir, pole);
  if (axis.lengthSq() < 1e-8) axis = new Vector3(1, 0, 0);
  axis.normalize();

  const candA = dir.clone().applyAxisAngle(axis, beta);
  const candB = dir.clone().applyAxisAngle(axis, -beta);
  const u = candA.dot(pole) >= candB.dot(pole) ? candA : candB;

  const wristTarget = shoulder.clone().addScaledVector(dir, d);
  const elbow = shoulder.clone().addScaledVector(u, upper);
  const f = wristTarget.clone().sub(elbow).normalize();

  // Repère local du bras : -y le long du bras, +z vers où l'avant-bras se plie.
  let zl = f.clone().addScaledVector(u, -f.dot(u));
  if (zl.lengthSq() < 1e-8) zl = pole.clone().addScaledVector(u, -pole.dot(u));
  zl.normalize();
  const yl = u.clone().negate();
  const xl = new Vector3().crossVectors(yl, zl).normalize();

  const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(xl, yl, zl));
  const e = new Euler().setFromQuaternion(q, 'ZXY');

  return {
    shoulder: q,
    shoulderEuler: [e.x, e.y, e.z],
    elbowX: -flex,
    reachable,
    wrist: elbow.clone().addScaledVector(f, fore),
  };
}
