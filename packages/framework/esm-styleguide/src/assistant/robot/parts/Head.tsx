import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CatmullRomCurve3, LatheGeometry, Quaternion, Vector2, Vector3, type Group, type Mesh } from 'three';
import type { RobotController } from '../controller.js';
import type { RobotMaterials } from '../materials.js';
import { Ellipsoid, useGradientTorus } from './primitives.js';

/*
 * Tête : mêmes proportions et mêmes constantes que le shader de `LiveOrb`
 * (crâne large, deux yeux ovales reliés par un trait fin, casques à anneau néon).
 * Toutes les cotes ci-dessous sont en « unités de tête » ; le groupe est ensuite mis à l'échelle.
 */
export const HEAD_SCALE = 0.24;
/** Hauteur du centre du crâne au-dessus de l'articulation de la tête (m). */
export const HEAD_CENTER_Y = 0.13;

const HEAD_R: [number, number, number] = [1.0, 0.74, 0.86];
const EYE_X = 0.455;
const EYE_Y = 0.075;
const EYE_RX = 0.118;
const EYE_RY = 0.128;
const LINE_HALF = 0.021;
const EAR_C = new Vector3(1.02, -0.1, 0.02);
const EAR_R = 0.385;
const EAR_HT = 0.072;
const EAR_ROUND = 0.045;
const RECESS_R = 0.335;
const RECESS_D = 0.02;
const RING_R = 0.272;
const RING_T = 0.034;
const RING_X = 0.062;
// Cos / sin du « toe-in » : le casque regarde un peu vers l'avant.
const EC = 0.9287;
const ES = 0.3709;

/** Point de la surface du crâne en (x, y), et sa normale. */
function surface(x: number, y: number) {
  const z = HEAD_R[2] * Math.sqrt(Math.max(0, 1 - (x / HEAD_R[0]) ** 2 - (y / HEAD_R[1]) ** 2));
  const p = new Vector3(x, y, z);
  const n = new Vector3(x / HEAD_R[0] ** 2, y / HEAD_R[1] ** 2, z / HEAD_R[2] ** 2).normalize();
  return { p, n };
}

function earCupGeometry() {
  const pts: Vector2[] = [new Vector2(0, -EAR_HT), new Vector2(EAR_R - EAR_ROUND, -EAR_HT)];
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    for (let i = 1; i <= 8; i++) {
      const a = a0 + ((a1 - a0) * i) / 8;
      pts.push(new Vector2(cx + EAR_ROUND * Math.cos(a), cy + EAR_ROUND * Math.sin(a)));
    }
  };
  arc(EAR_R - EAR_ROUND, -EAR_HT + EAR_ROUND, -Math.PI / 2, 0);
  arc(EAR_R - EAR_ROUND, EAR_HT - EAR_ROUND, 0, Math.PI / 2);
  pts.push(new Vector2(RECESS_R, EAR_HT), new Vector2(RECESS_R, EAR_HT - RECESS_D), new Vector2(0, EAR_HT - RECESS_D));
  return new LatheGeometry(pts, 56);
}

function EarCup({ side, m }: { side: 1 | -1; m: RobotMaterials }) {
  const geo = useMemo(earCupGeometry, []);
  const ring = useGradientTorus(RING_R, RING_T, m.ear1, m.ear2, side === 1 ? 0.6 : 2.5);
  const halo = useGradientTorus(RING_R, RING_T * 2.6, m.ear1, m.ear2, side === 1 ? 0.6 : 2.5);
  const quat = useMemo(() => {
    const axis = new Vector3(side * EC, 0, ES).normalize();
    return new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), axis);
  }, [side]);
  return (
    <group position={[side * EAR_C.x, EAR_C.y, EAR_C.z]} quaternion={quat}>
      <mesh geometry={geo} material={m.body} castShadow receiveShadow />
      {/* Anneau néon posé sur la face extérieure : le tore se tourne pour que son axe suive celui du casque. */}
      <group position={[0, RING_X, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh geometry={ring} material={m.neon} />
        <mesh geometry={halo} material={m.halo} />
      </group>
      <mesh position={[0, EAR_HT - RECESS_D + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.plate}>
        <circleGeometry args={[RECESS_R - 0.012, 40]} />
      </mesh>
    </group>
  );
}

export function Head({ controller, m }: { controller: RobotController; m: RobotMaterials }) {
  const eyeL = useRef<Mesh>(null);
  const eyeR = useRef<Mesh>(null);

  const eyes = useMemo(
    () =>
      [-1, 1].map((sx) => {
        const { p, n } = surface(sx * EYE_X, EYE_Y);
        const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), n);
        return { p: p.clone().addScaledVector(n, -0.004), q };
      }),
    [],
  );

  const lineGeo = useMemo(() => {
    const pts: Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const x = -EYE_X + (2 * EYE_X * i) / 24;
      const s = surface(x, EYE_Y);
      pts.push(s.p.addScaledVector(s.n, 0.004));
    }
    return new CatmullRomCurve3(pts);
  }, []);

  useFrame(() => {
    const lid = 1 - 0.9 * controller.blink;
    if (eyeL.current) eyeL.current.scale.y = EYE_RY * lid;
    if (eyeR.current) eyeR.current.scale.y = EYE_RY * lid;
  });

  return (
    <group position={[0, HEAD_CENTER_Y, 0]} scale={HEAD_SCALE}>
      <Ellipsoid radii={HEAD_R} material={m.body} segments={64} />
      {eyes.map((e, i) => (
        <group key={i} position={e.p} quaternion={e.q}>
          <mesh ref={i === 0 ? eyeL : eyeR} scale={[EYE_RX, EYE_RY, 0.03]} material={m.eye}>
            <sphereGeometry args={[1, 32, 24]} />
          </mesh>
        </group>
      ))}
      <mesh material={m.eye}>
        <tubeGeometry args={[lineGeo, 40, LINE_HALF, 8, false]} />
      </mesh>
      <EarCup side={1} m={m} />
      <EarCup side={-1} m={m} />
    </group>
  );
}
