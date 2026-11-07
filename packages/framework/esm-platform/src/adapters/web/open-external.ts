import { PlatformError } from '../../errors.js';
import type { OpenExternalCapability } from '../../types.js';

const ALLOWED_PROTOCOLS = new Set(['https:', 'mailto:', 'tel:']);

/**
 * Valide une URL à ouvrir hors de l'app : schémas `https:`, `mailto:`, `tel:` UNIQUEMENT (ni `http:`, ni
 * `javascript:`, ni `data:`, ni `file:`…). Le message d'erreur ne reprend jamais l'URL (elle peut contenir un secret).
 */
export function assertExternalUrl(url: unknown): string {
  let parsed: URL | null = null;
  try {
    parsed = typeof url === 'string' ? new URL(url) : null;
  } catch {
    parsed = null;
  }
  if (!parsed || !ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new PlatformError('INVALID_ARGS', 'URL refusée : seuls les schémas https:, mailto: et tel: sont autorisés.', {
      capability: 'openExternal',
      method: 'open',
    });
  }
  return parsed.href;
}

/** `openExternal` en Web : `window.open(url, '_blank', 'noopener,noreferrer')` après validation. */
export function createWebOpenExternal(): OpenExternalCapability {
  return {
    async open(url) {
      const href = assertExternalUrl(url);
      // `noopener` : la page ouverte n'a pas accès à `window.opener` ; le retour de `open` est alors toujours `null`.
      window.open(href, '_blank', 'noopener,noreferrer');
    },
  };
}
