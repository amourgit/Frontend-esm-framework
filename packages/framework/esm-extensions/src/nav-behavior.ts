/** @module @category Extension */
import { createGlobalStore } from '@egen-civitas/esm-state';

/**
 * Cible d'un comportement de navigation : une entrée (le lien d'un menu, identifiée par le nom de
 * son extension dans `routes.json`) ou une section (le bouton de niveau 2, identifié par `section`).
 */
export type NavBehaviorTarget = { entry: string } | { section: string };

/** Contexte transmis à `NavBehavior.onSelect` quand l'utilisateur active un bouton de navigation. */
export interface NavSelectContext {
  /** Ce qui a été activé. */
  target: NavBehaviorTarget;
  /** Route visée, relative à la base SPA (ex. `annuaire/contacts`) ; absente pour une section sans `sectionRoute`. */
  route?: string;
  /** Identifiant de l'espace actif (ex. `intranet`). */
  workspaceId: string;
  /**
   * Exécute la logique globale de la TopBar (son, fermeture du menu, navigation). Un comportement
   * qui REMPLACE le défaut peut ne pas l'appeler ; un qui l'ENRICHIT l'appelle (avant ou après).
   */
  runDefault: () => void;
}

export interface NavBehavior {
  /** Remplace la logique globale appliquée au clic. Appeler `ctx.runDefault()` pour la conserver. */
  onSelect: (ctx: NavSelectContext) => void;
}

interface NavBehaviorStore {
  behaviors: Record<string, NavBehavior>;
}

/** @internal */
export const navBehaviorStore = createGlobalStore<NavBehaviorStore>('nav-behaviors', { behaviors: {} });

const keyOf = (target: NavBehaviorTarget): string =>
  'entry' in target ? `entry:${target.entry}` : `section:${target.section}`;

/**
 * Déclare le comportement d'un bouton de navigation du niveau 2 de la TopBar, à appeler au
 * démarrage de l'app (`startupApp`). Sans comportement déclaré, la TopBar applique sa logique
 * globale. Un seul comportement par cible : le dernier enregistré l'emporte.
 *
 * @returns Une fonction qui retire ce comportement (sans effet s'il a été remplacé depuis).
 *
 * @example
 * ```ts
 * registerNavBehavior({ entry: 'annuaire-nav-contacts' }, {
 *   onSelect: ({ runDefault }) => {
 *     trackEvent('annuaire.contacts');
 *     runDefault();
 *   },
 * });
 * ```
 */
export function registerNavBehavior(target: NavBehaviorTarget, behavior: NavBehavior): () => void {
  const key = keyOf(target);
  navBehaviorStore.setState((s) => ({ behaviors: { ...s.behaviors, [key]: behavior } }));
  return () => {
    const { behaviors } = navBehaviorStore.getState();
    if (behaviors[key] !== behavior) return;
    const { [key]: _removed, ...rest } = behaviors;
    navBehaviorStore.setState({ behaviors: rest });
  };
}

/** Comportement déclaré pour une cible, s'il y en a un. */
export function getNavBehavior(target: NavBehaviorTarget): NavBehavior | undefined {
  return navBehaviorStore.getState().behaviors[keyOf(target)];
}
