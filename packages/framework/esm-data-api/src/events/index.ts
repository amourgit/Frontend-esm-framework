import {
  type EventsWithPayload,
  type EgenEvent,
  type EventsWithoutPayload,
  type EventTypes,
  type PageChanged,
} from './types';
export { type EgenEvent, type EventTypes as EgenEventTypes } from './types';

export function fireEgenEvent<T extends EventsWithoutPayload>(event: T, payload?: never): boolean;
export function fireEgenEvent<T extends EventsWithPayload>(event: T, payload: EventTypes[T]): boolean;
/**
 * Fires an Egen custom event
 *
 * @param event The custom event to fire
 * @param payload The payload associated with this type of event
 * @returns true if the event was not cancelled and false, i.e., the result of `dispatchEvent()`
 */
export function fireEgenEvent<T extends EgenEvent>(event: T, payload?: EventTypes[T]): boolean {
  const evt = new CustomEvent(`egen:${event}`, { detail: payload ?? undefined, cancelable: true, bubbles: true });
  return window.dispatchEvent(evt);
}

/**
 * Subscribes to a custom Egen event
 *
 * @param event The name of the event to listen to
 * @param handler The callback to be called when the event fires
 */
export function subscribeEgenEvent(event: 'started', handler: (payload: undefined) => void);
export function subscribeEgenEvent(event: 'before-page-changed', handler: (payload: PageChanged) => void);
export function subscribeEgenEvent<T extends EgenEvent>(
  event: T,
  handler: (payload?: EventTypes[T]) => void,
): () => void {
  const internalHandler = (event: Event) => {
    const detail = 'detail' in event && event.detail !== null ? event.detail : undefined;
    handler(detail as EventTypes[T]);
  };

  window.addEventListener(`egen:${event}`, internalHandler);
  return () => {
    window.removeEventListener(`egen:${event}`, internalHandler);
  };
}
