// =============================================================================
//  @egen-civitas/esm-ai-tools — Résolution d'une cible pour les tools de lecture
//
//  Un seul vocabulaire pour désigner un élément, commun à inspect_element,
//  read_component, read_table, scroll_to… :
//    1. ref       — référence « e42 » obtenue via read_page / find_in_page / discover_components ;
//    2. actionId  — id déclaré par l'app (catalogue d'actions / observables) ;
//    3. selector  — sélecteur CSS (+ matchIndex), y compris dans les Shadow DOM ouverts.
// =============================================================================

import { getObservableElement, getVisibleObservableEntries } from '../observables.js';
import { getUIActionElement, getVisibleUIActionEntries } from '../ui-actions.js';
import { resolveElementRef, walkElementsDeep } from './dom-utils.js';

export type TargetResolution =
  { ok: true; el: Element; via: 'ref' | 'actionId' | 'selector'; actionId?: string } | { ok: false; error: string };

/** Paramètres de ciblage à déclarer dans le schéma d'un tool (à fusionner avec ses autres paramètres). */
export const TARGET_PARAMS = {
  ref: {
    type: 'string' as const,
    required: false,
    description:
      "Référence d'élément « eNN » renvoyée par read_page, find_in_page, discover_components ou read_component. " +
      'Prioritaire sur actionId et selector.',
  },
  actionId: {
    type: 'string' as const,
    required: false,
    description: "Identifiant d'une action ou d'un observable déclaré par l'app (catalogue du contexte).",
  },
  selector: {
    type: 'string' as const,
    required: false,
    description:
      "Sélecteur CSS (ex: '.card__title', '#submit'). Les Shadow DOM ouverts sont explorés si rien n'est trouvé dans le document.",
  },
  matchIndex: {
    type: 'number' as const,
    required: false,
    description: 'Si selector matche plusieurs éléments, index (0-based) de celui à utiliser. Défaut : 0.',
  },
};

function queryAllDeep(selector: string): Element[] {
  const direct = Array.from(document.querySelectorAll(selector));
  if (direct.length > 0) return direct;
  const found: Element[] = [];
  for (const el of walkElementsDeep(document.documentElement)) {
    try {
      if (el.matches(selector)) found.push(el);
    } catch {
      return [];
    }
    if (found.length >= 200) break;
  }
  return found;
}

/** Id déclaré par l'app (action ou observable) pour cet élément précis, si elle en a déclaré un. */
export function findDeclaredId(el: Element): string | undefined {
  try {
    return (
      getVisibleUIActionEntries().find((e) => e.element === el)?.definition.id ??
      getVisibleObservableEntries().find((e) => e.element === el)?.definition.id
    );
  } catch {
    return undefined;
  }
}

export function resolveTarget(args: Record<string, unknown>): TargetResolution {
  const ref = args.ref ? String(args.ref) : undefined;
  const actionId = args.actionId ? String(args.actionId) : undefined;
  const selector = args.selector ? String(args.selector) : undefined;
  const matchIndex = typeof args.matchIndex === 'number' ? args.matchIndex : 0;

  if (ref) {
    const el = resolveElementRef(ref);
    if (el) return { ok: true, el, via: 'ref', actionId: findDeclaredId(el) };
    if (!actionId && !selector) {
      return {
        ok: false,
        error: `La référence « ${ref} » n'existe pas ou l'élément a quitté la page — relancer read_page / find_in_page pour obtenir des références à jour.`,
      };
    }
  }

  if (actionId) {
    const el = getUIActionElement(actionId) ?? getObservableElement(actionId);
    if (el) return { ok: true, el, via: 'actionId', actionId };
    if (!selector) {
      return {
        ok: false,
        error: `Aucun élément visible à l'écran avec l'id « ${actionId} ». Vérifie le catalogue courant (list_ui_actions / list_observables).`,
      };
    }
  }

  if (selector) {
    let matches: Element[];
    try {
      matches = queryAllDeep(selector);
    } catch {
      return { ok: false, error: `Sélecteur CSS invalide : « ${selector} ».` };
    }
    if (matches.length === 0) return { ok: false, error: `Aucun élément ne correspond au sélecteur "${selector}".` };
    const el = matches[matchIndex];
    if (!el) {
      return {
        ok: false,
        error: `matchIndex ${matchIndex} hors limites : "${selector}" ne matche que ${matches.length} élément(s).`,
      };
    }
    return { ok: true, el, via: 'selector', actionId: findDeclaredId(el) };
  }

  return { ok: false, error: 'Fournir ref, actionId (id connu du catalogue) ou selector (sélecteur CSS).' };
}
