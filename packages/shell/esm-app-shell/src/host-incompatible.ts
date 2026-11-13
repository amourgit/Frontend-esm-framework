import { isPlatformError } from '@egen-civitas/esm-platform';

/**
 * Erreur de démarrage : le Host natif est manquant ou incompatible (handshake refusé).
 * Elle interrompt la chaîne d'initialisation (aucune app n'est enregistrée) et provoque l'écran bloquant.
 */
export class HostIncompatibleError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'HostIncompatibleError';
  }
}

/** `true` si l'erreur de `platform.ready` signifie « Host manquant ou incompatible » (code `INCOMPATIBLE`). */
export function isHostIncompatible(error: unknown): boolean {
  return error instanceof HostIncompatibleError || (isPlatformError(error) && error.code === 'INCOMPATIBLE');
}

const TEXTS = {
  fr: {
    title: 'Mise à jour de l’application requise',
    body: 'Cette version de l’application n’est plus compatible avec votre appareil. Mettez l’application à jour, puis relancez-la.',
    reload: 'Réessayer',
  },
  en: {
    title: 'Application update required',
    body: 'This version of the application is no longer compatible with your device. Update the application, then restart it.',
    reload: 'Retry',
  },
};

/** Construit l'écran bloquant (DOM pur, sans dépendance au gabarit HTML ni à i18n, pas encore initialisé). */
export function renderHostIncompatibleScreen(error: unknown, doc: Document = document): HTMLElement {
  const lang = (doc.documentElement.lang || navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
  const t = TEXTS[lang];

  const root = doc.createElement('div');
  root.className = 'egen-app-error egen-host-incompatible';
  root.setAttribute('role', 'alert');

  const title = doc.createElement('h1');
  title.textContent = t.title;
  const body = doc.createElement('p');
  body.textContent = t.body;
  const detail = doc.createElement('p');
  detail.className = 'egen-host-incompatible__detail';
  detail.textContent = error instanceof Error ? error.message : '';
  const button = doc.createElement('button');
  button.className = 'cds--btn cds--btn--primary';
  button.type = 'button';
  button.textContent = t.reload;
  button.addEventListener('click', () => location.reload());

  root.append(title, body, detail, button);
  doc.body.appendChild(root);
  return root;
}
