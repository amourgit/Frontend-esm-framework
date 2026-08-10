// =============================================================================
//  @egen/esm-ai-tools — Registre d'observables IA
//
//  Symétrique au registre d'actions UI (ui-actions.ts), mais pour ce que le
//  LLM doit CONNAÎTRE plutôt que DÉCLENCHER : un message d'erreur affiché,
//  le contenu d'un tableau, les lignes d'une liste, les données d'une carte.
//
//  Choix délibéré : on n'enregistre JAMAIS de CSS brut ni la position comme
//  simple métadonnée statique. Deux raisons :
//    1. Le CSS ne porte aucun sens pour un LLM qui raisonne — il a besoin de
//       savoir qu'un champ EST en erreur, pas que sa bordure est #da1e28.
//       Le champ `state` porte cette information de façon SÉMANTIQUE
//       ('error' | 'success' | 'warning' | 'info' | 'neutral' | une chaîne
//       libre définie par le composant), jamais une valeur de style.
//    2. La position peut changer à tout instant (scroll, resize, re-render)
//       — la stocker au moment de l'enregistrement la rendrait obsolète
//       immédiatement. `getObservablesCatalogForLLM()` calcule donc le
//       rectangle (`getBoundingClientRect`) À LA LECTURE, jamais en cache.
//
//  Enregistrement, via le hook useAIObservable (@egen/esm-ai-framework) :
//
//  ```tsx
//  const tableRef = useAIObservable<HTMLDivElement>({
//    id: 'students-list:table',
//    kind: 'table',
//    label: 'Liste des étudiants',
//    description: 'Étudiants inscrits dans la classe courante, avec leur statut.',
//    getData: () => students.map((s) => ({ nom: s.name, statut: s.status })),
//  });
//  return <div ref={tableRef}>...</div>;
//  ```
// =============================================================================

export type AIObservableKind = 'text' | 'status' | 'list' | 'table' | 'card' | 'custom';

export interface AIObservableDefinition {
  /** Identifiant unique et stable (ex: "students-list:table"). */
  id: string;
  kind: AIObservableKind;
  /** Libellé court, tel qu'affiché à l'écran. */
  label: string;
  /** Description de ce que représente ce contenu, à destination du LLM. */
  description: string;
  /**
   * État sémantique optionnel — JAMAIS une valeur CSS. Ex: 'error',
   * 'success', 'warning', 'info', 'neutral', ou tout libellé métier propre
   * au composant (ex: 'overdue', 'pending'). Voir note en tête de fichier.
   */
  state?: string;
  /**
   * Retourne la donnée structurée représentée par cet élément (texte, ou
   * tableau d'objets pour une liste/table/carte). Appelée à la lecture du
   * catalogue — doit être rapide et ne jamais throw (une erreur est
   * capturée et remplacée par `null`, sans jamais faire échouer tout le
   * catalogue pour les autres observables).
   */
  getData: () => unknown;
  moduleName?: string;
}

export interface AIObservableSnapshot {
  id: string;
  kind: AIObservableKind;
  label: string;
  description: string;
  state?: string;
  data: unknown;
  /** Rectangle courant dans la fenêtre (arrondi au pixel), calculé à la lecture. */
  position: { x: number; y: number; width: number; height: number };
}

interface RegisteredObservable extends AIObservableDefinition {
  element: HTMLElement;
}

const _observables = new Map<string, RegisteredObservable>();
const _listeners = new Set<() => void>();

function notifyChange(): void {
  _listeners.forEach((cb) => cb());
}

/** Notifié à chaque enregistrement/désenregistrement — pour un context provider réactif. */
export function subscribeToObservables(onChange: () => void): () => void {
  _listeners.add(onChange);
  return () => _listeners.delete(onChange);
}

/** Enregistre un élément descriptif. Retourne une fonction de nettoyage (voir useAIObservable). */
export function registerObservable(def: AIObservableDefinition, element: HTMLElement): () => void {
  _observables.set(def.id, { ...def, element });
  notifyChange();
  return () => {
    const current = _observables.get(def.id);
    if (current?.element === element) {
      _observables.delete(def.id);
      notifyChange();
    }
  };
}

/**
 * Résout l'élément DOM réel d'un observable, ou `null` s'il n'existe pas / n'est
 * plus visible. Symétrique à getUIActionElement() (ui-actions.ts) — utilisé par
 * inspect_element pour permettre l'adressage par id déclaré, en plus du selector
 * CSS générique.
 */
export function getObservableElement(id: string): HTMLElement | null {
  const obs = _observables.get(id);
  if (!obs || !obs.element.isConnected) return null;
  return obs.element;
}

/** Retourne la définition déclarée d'un observable (sans l'élément DOM ni getData), ou `null`. */
export function getObservableDefinition(id: string): Omit<AIObservableDefinition, 'getData'> | null {
  const obs = _observables.get(id);
  if (!obs || !obs.element.isConnected) return null;
  const { element, getData, ...rest } = obs;
  return rest;
}

function safeGetData(getData: () => unknown, id: string): unknown {
  try {
    return getData();
  } catch (err) {
    // Une erreur dans le calcul d'UN observable ne doit jamais faire
    // échouer le catalogue entier — les autres composants ne sont pas
    // responsables de ce bug.
    return { error: `Impossible de lire les données de "${id}": ${String(err)}` };
  }
}

/**
 * Catalogue des observables actuellement VISIBLES à l'écran, position et
 * données recalculées à l'instant de l'appel.
 */
export function getObservablesCatalogForLLM(): AIObservableSnapshot[] {
  const snapshots: AIObservableSnapshot[] = [];

  for (const obs of _observables.values()) {
    if (!obs.element.isConnected) continue;

    const rect = obs.element.getBoundingClientRect();
    snapshots.push({
      id: obs.id,
      kind: obs.kind,
      label: obs.label,
      description: obs.description,
      state: obs.state,
      data: safeGetData(obs.getData, obs.id),
      position: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    });
  }

  return snapshots;
}

/** @internal — tests uniquement */
export function _clearObservableRegistry(): void {
  _observables.clear();
  _listeners.clear();
}
