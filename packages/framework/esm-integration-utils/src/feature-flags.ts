import { featureFlagsStore } from '@egen-civitas/esm-feature-flags';
import { watchStore } from './store.js';
import type { Unsubscribe } from './types.js';

/** Observe l'état d'un drapeau de fonctionnalité (faux si inconnu, comme `useFeatureFlag`). */
export function watchFeatureFlag(flagName: string, onChange: (enabled: boolean) => void): Unsubscribe {
  return watchStore(
    featureFlagsStore as any,
    (s: any) => (s.flags?.[flagName]?.enabled ?? false) as boolean,
    onChange,
  );
}
