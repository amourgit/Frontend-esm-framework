import React from 'react';
import type { RobotMaterials } from '../materials.js';
import { Ellipsoid, Limb, Seam, useGradientTorus } from './primitives.js';
import { FINGER_LENGTH, type FingerName } from '../skeleton.js';

/* Chaque composant ci-dessous dessine UNE pièce, dans le repère de SON articulation
 * (l'axe y descend le long du membre). Il ne connaît ni la pose ni l'animation : c'est
 * l'arbre des articulations (Robot.tsx) qui le déplace. */

type M = { m: RobotMaterials };

/** Bassin : base du corps, centrée sur l'articulation des hanches. */
export function Pelvis({ m }: M) {
  return (
    <group>
      <Ellipsoid radii={[0.185, 0.13, 0.155]} position={[0, -0.005, 0]} material={m.body} />
      {/* Ceinture : anneau sombre fin autour de la taille, qui sépare visuellement bassin et torse. */}
      <mesh position={[0, 0.095, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.84, 1]} material={m.seam}>
        <torusGeometry args={[0.172, 0.011, 10, 56]} />
      </mesh>
    </group>
  );
}

/** Taille : le torse se resserre ici, ce qui donne une silhouette en V. */
export function Belly({ m }: M) {
  return <Ellipsoid radii={[0.185, 0.15, 0.15]} position={[0, 0.09, 0.004]} material={m.body} segments={48} />;
}

/** Poitrine large, avec le « cœur » lumineux aux couleurs des casques. */
export function Chest({ m }: M) {
  const ring = useGradientTorus(0.04, 0.008, m.ear1, m.ear2, 1);
  const halo = useGradientTorus(0.04, 0.02, m.ear1, m.ear2, 1);
  return (
    <group>
      <Ellipsoid radii={[0.285, 0.225, 0.205]} position={[0, 0.095, 0]} material={m.body} segments={56} />
      <group position={[0, 0.08, 0.2]} rotation={[-0.08, 0, 0]}>
        <mesh material={m.plate}>
          <circleGeometry args={[0.056, 36]} />
        </mesh>
        <mesh geometry={ring} material={m.neon} position={[0, 0, 0.003]} />
        <mesh geometry={halo} material={m.halo} position={[0, 0, 0.003]} />
      </group>
    </group>
  );
}

export function Neck({ m }: M) {
  return (
    <group>
      <mesh position={[0, 0.015, 0]} material={m.body} castShadow>
        <cylinderGeometry args={[0.052, 0.066, 0.1, 28]} />
      </mesh>
      <Seam radius={0.062} position={[0, -0.02, 0]} material={m.seam} />
    </group>
  );
}

/** Bras : épaulière ronde cerclée, segment effilé, puis articulation de coude apparente. */
export function UpperArm({ m }: M) {
  return (
    <group>
      <Ellipsoid radii={[0.092, 0.088, 0.088]} material={m.body} />
      <Seam radius={0.09} position={[0, -0.055, 0]} material={m.seam} thickness={0.005} />
      <Limb length={0.25} rTop={0.066} rBottom={0.057} material={m.body} />
    </group>
  );
}

export function ForeArm({ m }: M) {
  return (
    <group>
      <Seam radius={0.062} position={[0, -0.002, 0]} material={m.seam} thickness={0.005} />
      <Limb length={0.23} rTop={0.057} rBottom={0.046} material={m.body} />
      <Seam radius={0.05} position={[0, -0.205, 0]} material={m.seam} />
    </group>
  );
}

/** Paume : forme arrondie (la main entière est paume + 5 doigts à deux phalanges). */
export function Palm({ m }: M) {
  return (
    <group>
      <Seam radius={0.047} position={[0, -0.004, 0]} material={m.seam} />
      <Ellipsoid radii={[0.044, 0.054, 0.031]} position={[0, -0.05, 0.002]} material={m.body} segments={28} />
    </group>
  );
}

const FINGER_R: Record<FingerName, [number, number]> = {
  thumb: [0.0165, 0.0145],
  index: [0.0135, 0.0118],
  middle: [0.0142, 0.0122],
  ring: [0.0133, 0.0115],
  pinky: [0.0118, 0.0104],
};

/** Une phalange (1 = proximale, 2 = distale). */
export function Phalanx({ m, finger, segment }: M & { finger: FingerName; segment: 1 | 2 }) {
  const len = FINGER_LENGTH[finger][segment - 1]!;
  const [r1, r2] = FINGER_R[finger];
  const top = segment === 1 ? r1 : r2;
  const bottom = segment === 1 ? r2 : r2 * 0.85;
  return <Limb length={len} rTop={top} rBottom={bottom} material={m.body} radial={12} />;
}

export function Thigh({ m }: M) {
  return (
    <group>
      <Seam radius={0.09} position={[0, -0.03, 0]} material={m.seam} />
      <Limb length={0.27} rTop={0.092} rBottom={0.074} material={m.body} radial={32} />
    </group>
  );
}

export function Shin({ m }: M) {
  return (
    <group>
      <Seam radius={0.076} position={[0, -0.002, 0]} material={m.seam} thickness={0.005} />
      <Limb length={0.26} rTop={0.074} rBottom={0.054} material={m.body} radial={32} />
      <Seam radius={0.058} position={[0, -0.225, 0]} material={m.seam} />
    </group>
  );
}

export function Foot({ m }: M) {
  return (
    <group>
      <Seam radius={0.054} position={[0, -0.004, 0]} material={m.seam} />
      <Ellipsoid radii={[0.062, 0.04, 0.115]} position={[0, -0.03, 0.04]} material={m.body} segments={36} />
    </group>
  );
}
