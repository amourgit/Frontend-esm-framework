import React, { useMemo } from 'react';
import { BufferAttribute, Color, TorusGeometry, type BufferGeometry, type Material } from 'three';

type V3 = [number, number, number];

/** Sphère étirée en ellipsoïde — brique de base des formes rondes du corps. */
export function Ellipsoid({
  radii,
  position,
  rotation,
  material,
  segments = 40,
}: {
  radii: V3;
  position?: V3;
  rotation?: V3;
  material: Material;
  segments?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} scale={radii} material={material} castShadow receiveShadow>
      <sphereGeometry args={[1, segments, Math.round(segments * 0.75)]} />
    </mesh>
  );
}

/**
 * Segment de membre effilé : du haut de l'articulation (y = 0) jusqu'à y = -length,
 * avec une rondeur à chaque bout (le rayon haut et bas peuvent différer).
 * Les rondeurs sont centrées sur les articulations, ce qui garde les coudes et les
 * genoux lisses quand le membre se plie.
 */
export function Limb({
  length,
  rTop,
  rBottom,
  material,
  radial = 28,
}: {
  length: number;
  rTop: number;
  rBottom: number;
  material: Material;
  radial?: number;
}) {
  return (
    <group>
      <mesh position={[0, -length / 2, 0]} material={material} castShadow receiveShadow>
        <cylinderGeometry args={[rTop, rBottom, length, radial, 1, true]} />
      </mesh>
      <mesh material={material} castShadow receiveShadow scale={rTop}>
        <sphereGeometry args={[1, radial, 18]} />
      </mesh>
      <mesh position={[0, -length, 0]} material={material} castShadow receiveShadow scale={rBottom}>
        <sphereGeometry args={[1, radial, 18]} />
      </mesh>
    </group>
  );
}

/** Fine rainure circulaire autour d'un membre (joint de vinyle). */
export function Seam({
  radius,
  position,
  material,
  thickness = 0.0045,
  rotation = [Math.PI / 2, 0, 0],
}: {
  radius: number;
  position: V3;
  material: Material;
  thickness?: number;
  rotation?: V3;
}) {
  return (
    <mesh position={position} rotation={rotation} material={material}>
      <torusGeometry args={[radius, thickness, 8, 40]} />
    </mesh>
  );
}

/** Tore dont les sommets portent un dégradé entre deux couleurs (néon des casques et du cœur). */
export function useGradientTorus(radius: number, tube: number, c1: string, c2: string, phase = 0): BufferGeometry {
  return useMemo(() => {
    const g = new TorusGeometry(radius, tube, 16, 64);
    const pos = g.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const a = new Color(c1);
    const b = new Color(c2);
    const tmp = new Color();
    for (let i = 0; i < pos.count; i++) {
      const ang = Math.atan2(pos.getY(i), pos.getX(i));
      const k = 0.5 + 0.5 * Math.sin(ang + phase);
      tmp.copy(a).lerp(b, k);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new BufferAttribute(col, 3));
    return g;
  }, [radius, tube, c1, c2, phase]);
}
