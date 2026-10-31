/** @module @category Extension */
import { attach, registerExtension } from './extensions.js';
import type { ExtensionRegistration } from './store.js';
import {
  getToolWindowMetaProblems,
  TOOL_WINDOW_SLOTS,
  type ToolWindowAnchor,
  type ToolWindowMeta,
} from './tool-window.js';

export interface ToolWindowRegistration {
  /** Nom du module (de l'app) qui porte la fenêtre : celui de l'importmap / de la fédération. */
  moduleName: string;
  /** Identifiant unique de la fenêtre d'outils (nom de l'extension). */
  name: string;
  /** Zone dans laquelle le contenu s'ouvre ; détermine le rail (voir `ToolWindowMeta.rail` pour le bas). */
  anchor: ToolWindowAnchor;
  /** Bouton du rail + titre de la zone. */
  meta: ToolWindowMeta;
  /** Chargement du contenu (cycles de vie single-spa), appelé quand la zone s'ouvre. */
  load: ExtensionRegistration['load'];
  privileges?: ExtensionRegistration['privileges'];
  featureFlag?: string;
  displayExpression?: string;
}

/**
 * Déclare une fenêtre d'outils par le code, sans `routes.json` : pour une app fédérée ou open source
 * qui s'intègre au shell depuis son point d'entrée. Équivalent exact d'une extension `routes.json` posée
 * sur le slot de rail de la zone. Retourne `false` (et avertit) si la `meta` est invalide.
 */
export function registerToolWindow(registration: ToolWindowRegistration): boolean {
  const { moduleName, name, anchor, meta, load, privileges, featureFlag, displayExpression } = registration;
  const problems = getToolWindowMetaProblems(meta);
  if (problems.length > 0 || !TOOL_WINDOW_SLOTS[anchor]) {
    console.warn(
      `[workbench] La fenêtre d'outils « ${name} » de ${moduleName} n'est pas enregistrée : ${
        problems.join(' ; ') || `zone inconnue « ${String(anchor)} »`
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
  attach(TOOL_WINDOW_SLOTS[anchor], name);
  return true;
}
