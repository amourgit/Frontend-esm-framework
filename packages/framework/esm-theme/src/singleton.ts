// ============================================================================
//  EGEN THEME ENGINE — Instance singleton + API globale
// ============================================================================

import { ThemeEngine } from './engine';
import type { ThemeEngineOptions, ThemeEngineState, ThemeMode, ThemeSchema } from './types';

/**
 * Instance singleton du moteur de thème.
 * Elle est initialisée par `setupThemeEngine()` au boot du shell.
 *
 * NOTE MICROFRONTENDS : ce module DOIT être partagé en singleton via la
 * configuration Module Federation (`shared: { '@egen/esm-theme': { singleton: true, eager: true } }`)
 * pour toutes les apps consommatrices. Si chaque remote embarque sa propre
 * copie du module, plusieurs instances de `_engine` coexisteront et se
 * marcheront dessus (chacune réécrivant la même balise `<style>`).
 */
let _engine: ThemeEngine | null = null;

/**
 * Initialise et démarre le moteur de thème global.
 * À appeler une seule fois, au démarrage de l'app shell (run.ts).
 */
export async function setupThemeEngine(options: ThemeEngineOptions): Promise<ThemeEngine> {
  if (_engine) {
    _engine.destroy();
  }

  _engine = new ThemeEngine(options);
  await _engine.apply();
  return _engine;
}

/**
 * Retourne l'instance singleton.
 * Lance une erreur si `setupThemeEngine()` n'a pas encore été appelé.
 */
export function getThemeEngine(): ThemeEngine {
  if (!_engine) {
    throw new Error('[egen/esm-theme] ThemeEngine non initialisé. Appelez setupThemeEngine() au boot du shell.');
  }
  return _engine;
}

/**
 * Retourne l'état courant du thème actif (sans abonnement).
 * Retourne null si le moteur n'est pas encore initialisé.
 */
export function getThemeState(): ThemeEngineState | null {
  return _engine?.getState() ?? null;
}

/**
 * Raccourci pour recharger manuellement le thème (ex: après upload d'un fichier).
 */
export async function reloadTheme(): Promise<void> {
  await _engine?.apply();
}

/** Raccourci pour changer le mode clair/sombre depuis n'importe quelle app. */
export function setThemeMode(mode: ThemeMode): void {
  _engine?.setMode(mode);
}

/** Raccourci pour basculer le mode clair/sombre. */
export function toggleThemeMode(): void {
  _engine?.toggleMode();
}

/**
 * Raccourci — permet à une application microfrontend d'enregistrer sa
 * propre surcharge de thème, scopée à son conteneur racine, avec priorité.
 *
 * Pré-requis côté app : son conteneur racine doit porter l'attribut
 * `data-egen-app="<scope>"` (le même `scope` que celui utilisé ici) pour que
 * la surcharge CSS s'applique.
 *
 * @example
 * ```ts
 * // dans le run.ts d'une app microfrontend
 * applyAppThemeOverride('egen-academique', {
 *   colors: { primary: { '500': '#16a34a', '600': '#15803d' } },
 * }, { priority: 5 });
 * ```
 */
export function applyAppThemeOverride(
  scope: string,
  schema: Partial<ThemeSchema>,
  options?: { id?: string; priority?: number },
): void {
  _engine?.applyAppOverride(scope, schema, options);
}

/** Raccourci pour retirer une surcharge de thème d'une application. */
export function removeAppThemeOverride(scope: string, id?: string): void {
  _engine?.removeAppOverride(scope, id);
}

/**
 * Raccourci — applique une surcharge de thème GLOBALE (visible sur toute la
 * page, sans qu'aucun conteneur n'ait besoin de porter `data-egen-app`).
 *
 * C'est le mécanisme à utiliser pour un thème de TENANT ou une préférence
 * utilisateur globale — pas `applyAppThemeOverride`, qui ne s'applique qu'à
 * l'intérieur d'un conteneur portant explicitement `data-egen-app="<scope>"`.
 *
 * @example
 * ```ts
 * // dans le run.ts du shell, une fois le tenant résolu
 * applyGlobalThemeOverride({ colors: { primary: { '500': '#16a34a' } } }, { priority: 10 });
 * ```
 */
export function applyGlobalThemeOverride(
  schema: Partial<ThemeSchema>,
  options?: { id?: string; priority?: number },
): void {
  _engine?.applyGlobalOverride(schema, options);
}

/** Raccourci pour retirer une surcharge de thème globale. */
export function removeGlobalThemeOverride(id?: string): void {
  _engine?.removeGlobalOverride(id);
}
