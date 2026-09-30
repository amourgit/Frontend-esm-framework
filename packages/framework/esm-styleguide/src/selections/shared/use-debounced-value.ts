import * as React from 'react';

/**
 * Retourne `value` avec un délai de `delayMs` ms après la dernière modification.
 * `delayMs <= 0` : aucune temporisation (la valeur courante est retournée telle quelle,
 * sans rendu supplémentaire).
 */
export function useDebouncedValue<V>(value: V, delayMs: number): V {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    if (delayMs <= 0) return undefined;
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return delayMs <= 0 ? value : debounced;
}
