// =============================================================================
//  @egen/esm-ai-framework — React hooks pour les consommateurs (Layer 2)
// =============================================================================

import { useSyncExternalStore, useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useAIConfig, useAIEnabled } from '@egen/esm-ai-config';
import { aiContextStore, getAIContextJson } from '@egen/esm-ai-context';
import { getAllTools, executeTool, getToolsSchemaForLLM, registerUIAction, registerObservable } from '@egen/esm-ai-tools';
import { sessionStore } from '@egen/esm-api';
import type { AIToolRequest, AIToolResult, AIUIActionDefinition, AIObservableDefinition } from '@egen/esm-ai-tools';
import type { AIContext } from '@egen/esm-ai-context';

export { useAIConfig, useAIEnabled } from '@egen/esm-ai-config';

// ─── useAIContext ─────────────────────────────────────────────────────────────

/**
 * Hook React donnant accès au contexte IA courant (snapshot réactif).
 * Se met à jour automatiquement à chaque changement de session, tenant, route…
 */
export function useAIContext(): AIContext | null {
  return useSyncExternalStore(
    aiContextStore.subscribe,
    () => aiContextStore.getState().context,
    () => null,
  );
}

/**
 * Hook React pour le contexte IA sérialisé en JSON (pour l'envoi au backend).
 */
export function useAIContextJson(): string {
  return useSyncExternalStore(aiContextStore.subscribe, getAIContextJson, () => '{}');
}

// ─── useExecuteTool ───────────────────────────────────────────────────────────

export interface UseExecuteToolResult {
  execute: (request: AIToolRequest) => Promise<AIToolResult>;
  executing: boolean;
  lastResult: AIToolResult | null;
  lastError: string | null;
}

/**
 * Hook pour exécuter des tools IA depuis un composant React.
 *
 * @example
 * ```tsx
 * const { execute, executing } = useExecuteTool();
 * await execute({ tool: 'navigate', arguments: { route: '/students' } });
 * ```
 */
export function useExecuteTool(): UseExecuteToolResult {
  const executingRef = useRef(false);
  const [state, setState] = useSyncExternalStoreShim<{
    executing: boolean;
    lastResult: AIToolResult | null;
    lastError: string | null;
  }>({
    executing: false,
    lastResult: null,
    lastError: null,
  });

  const context = useAIContext();

  const execute = useCallback(
    async (request: AIToolRequest): Promise<AIToolResult> => {
      if (executingRef.current) {
        return { success: false, error: "Un tool est déjà en cours d'exécution", durationMs: 0 };
      }

      executingRef.current = true;
      setState((s) => ({ ...s, executing: true, lastError: null }));

      try {
        const result = await executeTool(request, context);
        setState({ executing: false, lastResult: result, lastError: result.error ?? null });
        return result;
      } catch (err) {
        const error = String(err);
        setState({ executing: false, lastResult: null, lastError: error });
        return { success: false, error, durationMs: 0 };
      } finally {
        executingRef.current = false;
      }
    },
    [context],
  );

  return { execute, ...state };
}

// ─── useAvailableTools ────────────────────────────────────────────────────────

/**
 * Hook retournant la liste des tools disponibles pour l'utilisateur courant.
 * Filtré selon les privilèges de la session.
 */
export function useAvailableToolsSchema(): object[] {
  const sessionState = useSyncExternalStore(
    sessionStore.subscribe,
    () => sessionStore.getState(),
    () => sessionStore.getState(),
  );

  const privileges =
    sessionState.loaded && sessionState.session?.user
      ? sessionState.session.user.privileges?.map((p) => p.display) ?? []
      : [];

  return getToolsSchemaForLLM(privileges);
}

// ─── useAIActionable ──────────────────────────────────────────────────────────

/**
 * Rend un élément DOM "actionnable" par l'assistant IA : l'enregistre dans le
 * registre d'actions UI (voir @egen/esm-ai-tools/ui-actions.ts) tant qu'il est
 * monté, et le retire automatiquement au démontage. Le LLM le découvre alors
 * via le contexte (catalogue des actions visibles) ou le tool list_ui_actions,
 * et peut le déclencher via click_element / fill_field — sans qu'AUCUN
 * workflow ne soit codé en dur : c'est le LLM qui compose la séquence.
 *
 * ```tsx
 * const submitRef = useAIActionable<HTMLButtonElement>({
 *   id: 'change-password:submit',
 *   kind: 'click',
 *   label: 'Valider le changement de mot de passe',
 *   description: 'Soumet le formulaire une fois les 3 champs remplis.',
 * });
 * return <Button ref={submitRef} type="submit">Confirmer</Button>;
 * ```
 *
 * `def` doit être stable entre les rendus (un objet recréé à chaque rendu
 * réenregistre inutilement à chaque fois) — mémoïser avec useMemo si construit
 * dynamiquement.
 */
export function useAIActionable<T extends HTMLElement>(def: AIUIActionDefinition): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current) return undefined;
    return registerUIAction(def, ref.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id, def.kind, def.label, def.description]);

  return ref;
}

// ─── useAIObservable ──────────────────────────────────────────────────────────

/**
 * Rend un élément DOM "observable" par l'assistant IA : contenu descriptif
 * (message d'état, liste, tableau, carte) que le LLM doit CONNAÎTRE sans
 * pouvoir le déclencher — voir @egen/esm-ai-tools/observables.ts. Enregistré
 * tant que l'élément est monté, retiré automatiquement au démontage.
 *
 * `getData` est réévalué à CHAQUE lecture du catalogue (pas seulement au
 * montage) — inutile de re-render ou de re-déclarer ce hook quand la donnée
 * change ; seule une variation de `id`/`kind`/`label`/`description`/`state`
 * déclenche un nouvel enregistrement.
 *
 * ```tsx
 * const tableRef = useAIObservable<HTMLDivElement>({
 *   id: 'students-list:table',
 *   kind: 'table',
 *   label: 'Liste des étudiants',
 *   description: 'Étudiants inscrits, avec leur statut.',
 *   getData: () => students.map((s) => ({ nom: s.name, statut: s.status })),
 * });
 * return <div ref={tableRef}>...</div>;
 * ```
 */
export function useAIObservable<T extends HTMLElement>(def: AIObservableDefinition): RefObject<T> {
  const ref = useRef<T>(null);

  // Toujours la dernière closure de getData, sans provoquer de
  // ré-enregistrement à chaque changement de donnée (voir commentaire ci-dessus).
  const getDataRef = useRef(def.getData);
  getDataRef.current = def.getData;

  useEffect(() => {
    if (!ref.current) return undefined;
    return registerObservable({ ...def, getData: () => getDataRef.current() }, ref.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id, def.kind, def.label, def.description, def.state]);

  return ref;
}

// ─── Shim helper ─────────────────────────────────────────────────────────────

/** Mini useState-like avec getter pour useSyncExternalStore */
function useSyncExternalStoreShim<T>(initial: T): [T, (updater: T | ((prev: T) => T)) => void] {
  const storeRef = useRef<{ value: T; listeners: Set<() => void> }>({
    value: initial,
    listeners: new Set(),
  });

  const setState = useCallback((updater: T | ((prev: T) => T)) => {
    const next = typeof updater === 'function' ? (updater as (p: T) => T)(storeRef.current.value) : updater;
    storeRef.current.value = next;
    storeRef.current.listeners.forEach((l) => l());
  }, []);

  const value = useSyncExternalStore(
    useCallback((listener) => {
      storeRef.current.listeners.add(listener);
      return () => storeRef.current.listeners.delete(listener);
    }, []),
    () => storeRef.current.value,
    () => initial,
  );

  return [value, setState];
}
