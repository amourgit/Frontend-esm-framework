import { useEffect } from 'react';
import { showPageLoader } from './page-loader.js';

/**
 * Garde le loader de page actif tant que `loading` est vrai (contenu pas fini de charger).
 *
 * ```tsx
 * const { isLoading } = useMyData();
 * usePageLoading(isLoading);
 * ```
 */
export function usePageLoading(loading: boolean) {
  useEffect(() => {
    if (!loading) return;
    return showPageLoader();
  }, [loading]);
}
