// =============================================================================
//  Garde-fous des tools natifs
//
//  Les tools sont appelés à distance par le backend IA (donc potentiellement
//  guidés par un contenu non fiable : prompt injection). Chaque entrée qui
//  touche à une URL, un chemin ou un nom de fichier est validée ICI, de façon
//  déterministe, avant d'agir sur le navigateur de l'utilisateur.
// =============================================================================

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

const SCHEME_URL = /^[a-z][a-z0-9+.-]*:\/\//i;
const TEMPLATE_PREFIX = /^\$\{(egenBase|egenSpaBase)\}/;

/**
 * Résout une route applicative vers la cible attendue par `navigate()`.
 * - chemin logique (« /students/1 ») → préfixé par `${egenSpaBase}` (navigation SPA, pas de rechargement) ;
 * - déjà préfixé par `${egenBase}` / `${egenSpaBase}` → inchangé ;
 * - URL absolue → acceptée UNIQUEMENT sur la même origine ; jamais un site externe.
 */
export function resolveAppRoute(route: string, origin = currentOrigin()): Checked<string> {
  const value = route.trim();
  if (!value) return { ok: false, error: 'La route est vide.' };

  if (SCHEME_URL.test(value)) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      return { ok: false, error: `URL invalide : « ${value} ».` };
    }
    if (!origin || parsed.origin !== origin) {
      return { ok: false, error: `Navigation vers un site externe refusée (${parsed.origin}).` };
    }
    return { ok: true, value };
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !TEMPLATE_PREFIX.test(value)) {
    return { ok: false, error: `Schéma d'URL non autorisé dans « ${value} ».` };
  }
  if (TEMPLATE_PREFIX.test(value)) return { ok: true, value };

  return { ok: true, value: `\${egenSpaBase}${value.startsWith('/') ? '' : '/'}${value}` };
}

/**
 * Valide un chemin d'API pour `fetch_data` : strictement relatif à l'API EGEN.
 * `egenFetch` laisse passer toute valeur commençant par « http » telle quelle (avec les
 * credentials et l'en-tête tenant) : on refuse donc tout ce qui n'est pas un chemin simple.
 */
export function validateApiPath(endpoint: string): string | null {
  const value = endpoint.trim();
  if (!value.startsWith('/') || value.startsWith('//')) return 'L\'endpoint doit être un chemin relatif commençant par un seul « / ».';
  if (value.includes('\\')) return "L'endpoint ne doit pas contenir de « \\ ».";
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return "L'endpoint contient un encodage invalide.";
  }
  if (/(^|\/)\.\.(\/|$|\?|#)/.test(decoded)) return "L'endpoint ne doit pas contenir de segment « .. ».";
  return null;
}

/** Valide l'URL d'un téléchargement : http(s) uniquement (jamais `javascript:` / `data:` qui s'exécuteraient au clic). */
export function validateDownloadUrl(url: string, origin = currentOrigin()): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url, origin || undefined);
  } catch {
    return `URL invalide : « ${url} ».`;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return `Seules les URL http(s) sont autorisées pour un téléchargement (reçu : ${parsed.protocol}).`;
  }
  return null;
}

/** Nom de fichier sûr : sans séparateur de chemin ni caractère de contrôle, longueur bornée. */
export function sanitizeFilename(name: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = name.replace(/[\u0000-\u001f\\/:*?"<>|]+/g, '_').replace(/^\.+/, '').trim().slice(0, 150);
  return cleaned || 'fichier';
}

export function isBase64(content: string): boolean {
  return content.length > 0 && content.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(content);
}

/** Slug de tenant : un seul label DNS (empêche « x.evil.com », « evil.com# », etc. dans le sous-domaine construit). */
export function isValidTenantSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(slug);
}

/** `${getEgenSpaBase()}` sans slash final. */
export function spaBaseTrimmed(): string {
  const base = (typeof window !== 'undefined' && window.getEgenSpaBase?.()) || '/';
  return base.replace(/\/+$/, '');
}

function currentOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}
