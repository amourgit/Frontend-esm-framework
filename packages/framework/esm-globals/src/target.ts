import type { EgenTarget } from './types.js';

/**
 * Retourne la cible de build du SPA courant.
 *
 * La cible est fixée AU BUILD (pont `EGEN_TARGET` → `window.egenTarget`) : elle n'est jamais devinée
 * (pas de User-Agent, pas de détection de bibliothèque). Absente ou invalide ⇒ `"web"`.
 *
 * @category Platform
 */
export function getEgenTarget(): EgenTarget {
  if (typeof window === 'undefined') {
    return 'web';
  }
  const value = window.egenTarget;
  return value === 'android' || value === 'ios' ? value : 'web';
}

/**
 * `true` si le SPA tourne dans une enveloppe native (Android / iOS).
 * Les comportements « verrouillés » (pas d'override d'import map, pas de bypass d'auth) s'appuient sur ceci.
 *
 * @category Platform
 */
export function isNativeTarget(): boolean {
  return getEgenTarget() !== 'web';
}
