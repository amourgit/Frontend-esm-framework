import { PlatformError } from '../../errors.js';

/**
 * Le Host est une frontière de confiance : ses réponses sont validées avant d'être rendues aux apps (un Host
 * compromis ou bogué ne doit pas pouvoir injecter un en-tête HTTP, un type inattendu ou une valeur démesurée).
 */

/** Valeur d'en-tête HTTP : ASCII visible, sans CR/LF (anti-injection d'en-têtes). */
const HEADER_VALUE = /^[\x21-\x7E][\x20-\x7E]*$/;
/** Un jeton ou un en-tête d'autorisation n'a aucune raison de dépasser cette taille. */
export const MAX_SECRET_LENGTH = 8192;
export const MAX_STORAGE_KEY_LENGTH = 256;

export function invalidHostResponse(capability: string, method: string): PlatformError {
  return new PlatformError('HOST_ERROR', `Réponse invalide du Host pour ${capability}.${method}.`, {
    capability,
    method,
  });
}

export function invalidArgs(capability: string, method: string, reason: string): PlatformError {
  return new PlatformError('INVALID_ARGS', `Arguments invalides pour ${capability}.${method} : ${reason}`, {
    capability,
    method,
  });
}

/** Valeur d'en-tête sûre (jamais reprise dans un message d'erreur : elle peut être un secret). */
export function isHeaderValue(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_SECRET_LENGTH && HEADER_VALUE.test(value);
}

export function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}
