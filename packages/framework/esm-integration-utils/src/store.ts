import type { StoreLike, Unsubscribe } from './types.js';

export interface WatchStoreOptions<U> {
  /** Émettre la valeur courante immédiatement (défaut `true`). */
  immediate?: boolean;
  /** Comparaison de la valeur sélectionnée (défaut `Object.is`). */
  equals?: (a: U, b: U) => boolean;
}

/** Observe une valeur dérivée d'un magasin ; n'émet que lorsqu'elle change. */
export function watchStore<T, U = T>(
  store: StoreLike<T>,
  select: (state: T) => U,
  onChange: (value: U) => void,
  { immediate = true, equals = Object.is }: WatchStoreOptions<U> = {},
): Unsubscribe {
  let current = select(store.getState());
  if (immediate) onChange(current);
  return store.subscribe((state) => {
    const next = select(state);
    if (!equals(current, next)) {
      current = next;
      onChange(next);
    }
  });
}
