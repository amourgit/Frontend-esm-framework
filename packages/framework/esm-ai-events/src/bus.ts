// =============================================================================
//  @egen/esm-ai-events — Bus d'événements IA
//
//  Utilise les CustomEvents du DOM (même pattern que esm-globals/events.ts)
//  + un Subject RxJS pour la composition réactive.
//  Singleton — un seul bus par application.
// =============================================================================

import { Subject, type Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import type { AIEventName, AIEventPayload, AIEventPayloadMap, AIEventListener, AIEventUnsubscribe } from './types';
import { AI_EVENTS } from './types';

// ─── Préfixe des Custom Events DOM ────────────────────────────────────────────
const DOM_EVENT_NS = 'egen:ai:';

// ─── Subject RxJS global ─────────────────────────────────────────────────────
interface AIBusMessage {
  name: AIEventName;
  payload: AIEventPayload;
}

const _bus$ = new Subject<AIBusMessage>();

/** Observable global de tous les événements IA — usage avancé */
export const aiEvents$: Observable<AIBusMessage> = _bus$.asObservable();

// ─── Générateur d'ID ─────────────────────────────────────────────────────────

let _eventCounter = 0;

function generateEventId(): string {
  return `egen-ai-evt-${Date.now()}-${++_eventCounter}`;
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Émet un événement IA.
 *
 * Diffuse simultanément via :
 *   1. Le Subject RxJS (pour les observables internes)
 *   2. Un CustomEvent DOM (pour l'interopérabilité avec d'autres apps)
 *
 * @example
 * ```ts
 * dispatchAIEvent(AI_EVENTS.TOOL_EXECUTED, {
 *   toolId: 'navigate',
 *   toolName: 'navigate',
 *   executionId: '...',
 *   durationMs: 42,
 *   success: true,
 * });
 * ```
 */
export function dispatchAIEvent<K extends AIEventName>(
  name: K,
  payload: Omit<AIEventPayloadMap[K], 'timestamp' | 'eventId'>,
): void {
  const fullPayload: AIEventPayloadMap[K] = {
    timestamp: new Date().toISOString(),
    eventId: generateEventId(),
    ...payload,
  } as AIEventPayloadMap[K];

  // Diffuser via RxJS
  _bus$.next({ name, payload: fullPayload });

  // Diffuser via DOM (interopérabilité cross-module)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name, { detail: fullPayload, bubbles: false, cancelable: false }));
  }
}

// ─── Subscribe ────────────────────────────────────────────────────────────────

/**
 * S'abonne à un événement IA spécifique.
 *
 * @returns Fonction de désinscription.
 *
 * @example
 * ```ts
 * const unsub = subscribeToAIEvent(AI_EVENTS.TOOL_EXECUTED, (payload) => {
 *   console.log('Tool exécuté :', payload.toolId, 'en', payload.durationMs, 'ms');
 * });
 * // Plus tard :
 * unsub();
 * ```
 */
export function subscribeToAIEvent<K extends AIEventName>(name: K, listener: AIEventListener<K>): AIEventUnsubscribe {
  const subscription = _bus$
    .pipe(
      filter((msg) => msg.name === name),
      map((msg) => msg.payload as AIEventPayloadMap[K]),
    )
    .subscribe(listener);

  return () => subscription.unsubscribe();
}

/**
 * Retourne un Observable filtré pour un type d'événement spécifique.
 * Utile pour la composition RxJS avancée.
 *
 * @example
 * ```ts
 * const toolExecs$ = observeAIEvent(AI_EVENTS.TOOL_EXECUTED);
 * toolExecs$.pipe(
 *   filter(p => p.toolId === 'navigate'),
 *   debounceTime(100),
 * ).subscribe(handleNavigate);
 * ```
 */
export function observeAIEvent<K extends AIEventName>(name: K): Observable<AIEventPayloadMap[K]> {
  return _bus$.pipe(
    filter((msg) => msg.name === name),
    map((msg) => msg.payload as AIEventPayloadMap[K]),
  );
}

/**
 * S'abonne à tous les événements IA (toutes catégories).
 * Utile pour le logging et le debugging global.
 */
export function subscribeToAllAIEvents(
  listener: (name: AIEventName, payload: AIEventPayload) => void,
): AIEventUnsubscribe {
  const subscription = _bus$.subscribe(({ name, payload }) => listener(name, payload));
  return () => subscription.unsubscribe();
}

// ─── Logger intégré ───────────────────────────────────────────────────────────

/** Active le logger de debug qui affiche tous les événements IA dans la console */
export function enableAIEventDebugLogger(): AIEventUnsubscribe {
  return subscribeToAllAIEvents((name, payload) => {
    console.warn(`[EGEN AI Event] ${name}`);
    console.warn('Payload:', payload);
  });
}
