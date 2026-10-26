/** @module @category UI */
import { loaderMarkup } from './loader-markup.js';

const SHOW_DELAY_MS = 120; // évite le clignotement sur les navigations quasi instantanées
const EXIT_MS = 300;

let holds = 0;
let overlay: HTMLElement | null = null;
let showTimer: number | undefined;
let hideTimer: number | undefined;

function mount() {
  window.clearTimeout(hideTimer);
  if (overlay?.isConnected) {
    overlay.className = 'egen-loader-overlay egen-anim-fade-in';
    return;
  }
  overlay = document.createElement('div');
  overlay.id = 'egen-page-loader';
  overlay.className = 'egen-loader-overlay egen-anim-fade-in';
  overlay.innerHTML = loaderMarkup();
  document.body.appendChild(overlay);
}

function unmount() {
  const current = overlay;
  if (!current) return;
  current.className = 'egen-loader-overlay egen-anim-fade-out';
  hideTimer = window.setTimeout(() => {
    current.remove();
    if (overlay === current) overlay = null;
  }, EXIT_MS);
}

/**
 * Affiche le loader de page tant qu'au moins un appelant le « retient ». Retourne la fonction de
 * libération (idempotente). Compteur : plusieurs chargements simultanés = un seul loader, retiré
 * quand le dernier est terminé.
 *
 * ```ts
 * const release = showPageLoader();
 * await fetchData();
 * release();
 * ```
 */
export function showPageLoader(): () => void {
  let released = false;
  holds += 1;
  if (holds === 1) {
    window.clearTimeout(showTimer);
    showTimer = window.setTimeout(mount, SHOW_DELAY_MS);
  }
  return () => {
    if (released) return;
    released = true;
    holds = Math.max(0, holds - 1);
    if (holds === 0) {
      window.clearTimeout(showTimer);
      unmount();
    }
  };
}
