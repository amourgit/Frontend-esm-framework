/** @module @category UI */
import { loaderMarkup } from './loader-markup.js';

export { loaderMarkup } from './loader-markup.js';
export { Loader, type LoaderProps } from './loader.component.js';
export { showPageLoader } from './page-loader.js';
export { usePageLoading } from './use-page-loading.js';
export { setupPageTransitions, playPageEnter } from './page-transitions.js';

/**
 * Affiche le loader EGEN plein écran dans `target` (démarrage du shell). Retourne la fonction
 * qui le retire avec une sortie en fondu.
 */
export function renderLoadingSpinner(target: HTMLElement) {
  const host = document.createElement('div');
  host.className = 'egen-loader-overlay egen-anim-fade-in';
  host.innerHTML = loaderMarkup();
  target.appendChild(host);

  return () => {
    host.className = 'egen-loader-overlay egen-anim-fade-out';
    window.setTimeout(() => host.remove(), 300);
  };
}
