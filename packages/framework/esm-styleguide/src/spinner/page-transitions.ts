/** @module @category UI */
import { showPageLoader } from './page-loader.js';

const ENTER_CLASS = 'egen-anim-page-enter';

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** Rejoue l'animation d'entrée du contenu des pages (#egen-apps-container). */
export function playPageEnter() {
  const container = document.getElementById('egen-apps-container');
  if (!container || prefersReducedMotion()) return;
  container.classList.remove(ENTER_CLASS);
  void container.offsetWidth; // force le reflow pour relancer l'animation
  container.classList.add(ENTER_CLASS);
  container.addEventListener(
    'animationend',
    (event) => {
      // Ignore les animationend des descendants ; la classe retirée libère le transform.
      if (event.target === container) container.classList.remove(ENTER_CLASS);
    },
    { once: false },
  );
}

/**
 * Branche les transitions de pages du shell : loader tant que les apps de la nouvelle page se
 * chargent (before-routing-event → routing-event), puis animation d'entrée du contenu.
 * Retourne la fonction de nettoyage.
 */
export function setupPageTransitions(): () => void {
  let release: (() => void) | null = null;

  const onBefore = (event: Event) => {
    const detail = (event as CustomEvent<{ totalAppChanges?: number }>).detail;
    if (!detail?.totalAppChanges) return;
    release?.();
    release = showPageLoader();
  };
  const onAfter = () => {
    release?.();
    release = null;
    playPageEnter();
  };

  window.addEventListener('single-spa:before-routing-event', onBefore);
  window.addEventListener('single-spa:routing-event', onAfter);
  return () => {
    window.removeEventListener('single-spa:before-routing-event', onBefore);
    window.removeEventListener('single-spa:routing-event', onAfter);
    release?.();
  };
}
