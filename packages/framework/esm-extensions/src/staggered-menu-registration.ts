/** @module @category Extension */
import { attach, registerExtension } from './extensions.js';
import type { ExtensionRegistration } from './store.js';
import {
  getStaggeredMenuEntryProblems,
  STAGGERED_MENU_SLOT,
  type StaggeredMenuEntryMeta,
} from './staggered-menu-slot.js';

export interface StaggeredMenuEntryRegistration {
  /** Nom du module (de l'app) qui porte le composant : celui de l'importmap / de la fédération. */
  moduleName: string;
  /** Identifiant unique de l'entrée (nom de l'extension). */
  name: string;
  /** Zone, ordre, priorité et portée de l'entrée. */
  meta: StaggeredMenuEntryMeta;
  /** Chargement du composant (cycles de vie single-spa), appelé quand le panneau s'ouvre pour la première fois. */
  load: ExtensionRegistration['load'];
  /**
   * Slot visé. Défaut : `STAGGERED_MENU_SLOT`. À renseigner pour viser un panneau qui a son propre slot
   * (prop `extensionSlot` de `StaggeredMenuPanel`).
   */
  slot?: string;
  privileges?: ExtensionRegistration['privileges'];
  featureFlag?: string;
  displayExpression?: string;
}

/**
 * Ajoute un composant libre au `StaggeredMenuPanel` par le code, sans `routes.json` : pour une app fédérée
 * ou open source qui s'intègre depuis son point d'entrée. Équivalent exact d'une extension `routes.json`
 * posée sur le slot du panneau. Retourne `false` (et avertit) si la `meta` est invalide.
 */
export function registerStaggeredMenuEntry(registration: StaggeredMenuEntryRegistration): boolean {
  const {
    moduleName,
    name,
    meta,
    load,
    slot = STAGGERED_MENU_SLOT,
    privileges,
    featureFlag,
    displayExpression,
  } = registration;
  const problems = getStaggeredMenuEntryProblems(meta);
  if (problems.length > 0 || !slot) {
    console.warn(
      `[staggered-menu] L'entrée « ${name} » de ${moduleName} n'est pas enregistrée : ${
        problems.join(' ; ') || 'slot vide'
      }.`,
    );
    return false;
  }
  registerExtension({
    name,
    moduleName,
    load,
    meta,
    privileges,
    featureFlag,
    displayExpression,
    online: true,
    offline: false,
  });
  attach(slot, name);
  return true;
}
