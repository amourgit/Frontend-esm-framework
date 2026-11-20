import type { LifeCycles } from 'single-spa';
import type { LifecycleExport } from './types.js';

/** Enveloppe des lifecycles déjà construits dans la forme attendue par le Shell. */
export function toLifecycleExport<P = any>(lifecycles: LifeCycles<P>): LifecycleExport<P> {
  return () => Promise.resolve(lifecycles);
}

/** Variante paresseuse : le module du composant n'est chargé qu'à la première demande du Shell. */
export function toAsyncLifecycleExport<M, P = any>(
  load: () => Promise<M>,
  build: (module: M) => LifeCycles<P>,
): LifecycleExport<P> {
  return () => load().then(build);
}
