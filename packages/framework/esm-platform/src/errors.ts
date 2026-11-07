/** Codes d'erreur normalisés d'une capacité de plateforme (protocole Host v1, annexe 1 du document de développement). */
export type PlatformErrorCode =
  'UNAVAILABLE' | 'DENIED' | 'CANCELLED' | 'INVALID_ARGS' | 'TIMEOUT' | 'INCOMPATIBLE' | 'HOST_ERROR';

export interface PlatformErrorOptions {
  /** `true` si rejouer le même appel peut réussir (ex. TIMEOUT). */
  retryable?: boolean;
  /** Capacité concernée (ex. `secureStorage`). */
  capability?: string;
  /** Méthode concernée (ex. `get`). */
  method?: string;
}

/**
 * Erreur typée de toute capacité de plateforme. Les capacités REJETTENT toujours avec cette classe :
 * jamais de `null` ambigu, jamais d'`Error` générique, jamais de texte localisé (les apps traduisent).
 *
 * @category Platform
 */
export class PlatformError extends Error {
  readonly code: PlatformErrorCode;
  readonly retryable: boolean;
  readonly capability?: string;
  readonly method?: string;

  constructor(code: PlatformErrorCode, message: string, options: PlatformErrorOptions = {}) {
    super(message);
    this.name = 'PlatformError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.capability = options.capability;
    this.method = options.method;
  }
}

/** Construit l'erreur standard d'une capacité indisponible dans l'environnement courant. */
export function unavailable(capability: string, method?: string): PlatformError {
  return new PlatformError('UNAVAILABLE', `La capacité "${capability}" n'est pas disponible dans cet environnement.`, {
    capability,
    method,
  });
}

/** Type guard : l'erreur vient-elle d'une capacité de plateforme ? */
export function isPlatformError(error: unknown): error is PlatformError {
  return error instanceof PlatformError;
}
