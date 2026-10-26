/** @module @category UI */

/** Noms des classes utilitaires d'animation (voir animations/_animations.scss). */
export const EGEN_ANIMATIONS = [
  'fade-in',
  'fade-out',
  'slide-in-from-left',
  'slide-in-from-right',
  'slide-in-from-top',
  'slide-in-from-bottom',
  'slide-out-to-left',
  'slide-out-to-right',
  'slide-out-to-top',
  'slide-out-to-bottom',
  'zoom-in',
  'zoom-out',
  'blur-in',
  'blur-out',
  'rise-in',
  'rise-out',
  'drop-in',
  'bounce-in',
  'flip-in-x',
  'flip-in-y',
  'wipe-in-left',
  'wipe-in-top',
  'wipe-out-left',
  'pulse',
  'float',
  'shake',
  'spin',
  'shimmer',
] as const;

export type EgenAnimation = (typeof EGEN_ANIMATIONS)[number];

/** Retourne la classe globale d'une animation : `animationClass('zoom-in')` → `egen-anim-zoom-in`. */
export function animationClass(name: EgenAnimation): string {
  return `egen-anim-${name}`;
}
