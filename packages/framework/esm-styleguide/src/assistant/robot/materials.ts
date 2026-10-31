import { useEffect, useMemo } from 'react';
import { Color, DoubleSide, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial } from 'three';

/** Mêmes valeurs que `LiveOrb`, pour que la tête et le corps soient d'une seule pièce. */
export const ROBOT_WHITE = { color: '#F4F4F5', eyeColor: '#09090B' } as const;
export const ROBOT_BLACK = { color: '#18181B', eyeColor: '#F4F4F5' } as const;
export const ROBOT_EAR_COLORS: [string, string] = ['#3DBA2E', '#F2E62F'];

export interface RobotTheme {
  /** Préréglage de matière. Défaut `"white"`. */
  variant?: 'white' | 'black' | 'custom';
  /** Couleur du corps (variant `custom`). */
  color?: string;
  /** Couleur des yeux (variant `custom`). */
  eyeColor?: string;
  /** Dégradé néon des casques et du cœur lumineux : deux couleurs. */
  earColors?: [string, string];
}

export function resolveRobotTheme(theme: RobotTheme = {}) {
  let body: string = ROBOT_WHITE.color;
  let eye: string = ROBOT_WHITE.eyeColor;
  if (theme.variant === 'black') {
    body = ROBOT_BLACK.color;
    eye = ROBOT_BLACK.eyeColor;
  } else if (theme.variant === 'custom') {
    body = theme.color ?? '#7C5CFF';
    eye = theme.eyeColor ?? '#FAFAFA';
  }
  const ears = theme.earColors && theme.earColors.length > 0 ? theme.earColors : ROBOT_EAR_COLORS;
  return { body, eye, ear1: ears[0], ear2: ears[1] ?? ears[0] };
}

export interface RobotMaterials {
  /** Vinyle blanc brillant du corps. */
  body: MeshPhysicalMaterial;
  /** Rainures aux articulations : légèrement plus sombre que le corps. */
  seam: MeshStandardMaterial;
  /** Plaques sombres des casques. */
  plate: MeshStandardMaterial;
  /** Yeux et ligne du visage. */
  eye: MeshStandardMaterial;
  /** Néon qui s'éclaire seul (pas affecté par les lumières). */
  neon: MeshBasicMaterial;
  /** Halo additif autour du néon. */
  halo: MeshBasicMaterial;
  ear1: string;
  ear2: string;
}

export function createRobotMaterials(theme: RobotTheme = {}): RobotMaterials {
  const t = resolveRobotTheme(theme);
  const body = new MeshPhysicalMaterial({
    color: t.body,
    roughness: 0.36,
    metalness: 0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.28,
    sheen: 0.5,
    sheenRoughness: 0.6,
    sheenColor: new Color('#ffffff'),
  });
  const seam = new MeshStandardMaterial({
    color: new Color(t.body).multiplyScalar(0.78),
    roughness: 0.55,
  });
  const plate = new MeshStandardMaterial({ color: new Color(t.body).multiplyScalar(0.2).addScalar(0.05), roughness: 0.35 });
  const eye = new MeshStandardMaterial({ color: t.eye, roughness: 0.25, metalness: 0 });
  const neon = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide });
  const halo = new MeshBasicMaterial({
    vertexColors: true,
    toneMapped: false,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: 2, // AdditiveBlending
    side: DoubleSide,
  });
  return { body, seam, plate, eye, neon, halo, ear1: t.ear1, ear2: t.ear2 };
}

export function useRobotMaterials(theme?: RobotTheme): RobotMaterials {
  const key = JSON.stringify(theme ?? {});
  const mats = useMemo(() => createRobotMaterials(theme), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      for (const m of [mats.body, mats.seam, mats.plate, mats.eye, mats.neon, mats.halo]) m.dispose();
    },
    [mats],
  );
  return mats;
}
