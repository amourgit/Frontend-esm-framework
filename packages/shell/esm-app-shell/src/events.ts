import {
  cleanupObsoleteFeatureFlags,
  getCurrentUser,
  subscribeEgenEvent,
} from '@egen-civitas/esm-framework/src/internal';
import { setupOptionalDependencies } from './optionaldeps';

subscribeEgenEvent('started', () => cleanupObsoleteFeatureFlags());
subscribeEgenEvent('started', () => {
  const subscription = getCurrentUser().subscribe((session) => {
    if (session.authenticated) {
      subscription?.unsubscribe();
      setupOptionalDependencies();
    }
  });
});
