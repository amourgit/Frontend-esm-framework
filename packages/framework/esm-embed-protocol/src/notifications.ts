import { isPlainObject } from './guards.js';

/**
 * Politique des notifications (toasts) d'une app embarquée, fixée par l'opérateur dans le grant `notifications`.
 *
 * - `exclusive` (défaut `true`) : le Core est le SEUL afficheur ; l'app ne doit pas afficher les siens (sinon deux toasts identiques).
 *   `false` : le Core affiche ET l'app peut afficher les siens (l'app l'assume).
 * - `rate` : nombre maximal de toasts acceptés par fenêtre glissante (défaut 10 par 10 s) — une iframe ne doit pas pouvoir
 *   inonder l'interface du Core ni imiter des messages système en rafale.
 */
export interface NotificationPolicy {
  exclusive: boolean;
  rate: { max: number; perSeconds: number };
}

export const NOTIFICATION_DEFAULTS: Readonly<NotificationPolicy> = Object.freeze({ exclusive: true, rate: Object.freeze({ max: 10, perSeconds: 10 }) });

const intIn = (v: unknown, min: number, max: number): number | undefined => (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : undefined);

/** Politique effective à partir de la config d'un grant ; toute valeur invalide retombe sur le défaut (jamais d'erreur, jamais plus permissif). */
export function notificationPolicy(config: unknown): NotificationPolicy {
  const c = isPlainObject(config) ? config : {};
  const rate = isPlainObject(c.rate) ? c.rate : {};
  return {
    exclusive: c.exclusive === false ? false : true,
    rate: {
      max: intIn(rate.max, 1, 100) ?? NOTIFICATION_DEFAULTS.rate.max,
      perSeconds: intIn(rate.perSeconds, 1, 3600) ?? NOTIFICATION_DEFAULTS.rate.perSeconds,
    },
  };
}

/** Erreurs d'une config de grant `notifications` (pour les outils de validation : opérateur et manifeste). */
export function validateNotificationConfig(config: unknown): string[] {
  if (!isPlainObject(config)) return ['notifications : objet attendu'];
  const errors: string[] = [];
  if (config.exclusive !== undefined && typeof config.exclusive !== 'boolean') errors.push('notifications.exclusive : booléen attendu');
  if (config.rate !== undefined) {
    if (!isPlainObject(config.rate)) errors.push('notifications.rate : objet { max, perSeconds } attendu');
    else {
      if (intIn(config.rate.max, 1, 100) === undefined) errors.push('notifications.rate.max : entier de 1 à 100');
      if (intIn(config.rate.perSeconds, 1, 3600) === undefined) errors.push('notifications.rate.perSeconds : entier de 1 à 3600');
    }
  }
  return errors;
}

/** Fenêtre glissante : `true` si l'événement est admis. */
export function createSlidingLimiter(max: number, perSeconds: number, now: () => number = Date.now): () => boolean {
  const stamps: number[] = [];
  return () => {
    const t = now();
    const cutoff = t - perSeconds * 1000;
    while (stamps.length && stamps[0] <= cutoff) stamps.shift();
    if (stamps.length >= max) return false;
    stamps.push(t);
    return true;
  };
}
