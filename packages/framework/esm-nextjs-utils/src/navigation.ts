/**
 * Navigation partagée Shell ↔ application embarquée (protocole 1.1, additif).
 *
 * L'URL du Core reste la source de vérité, comme pour une app interne : `<base>/<route>/<chemin-de-l'app>?q#h`.
 * Ce module ne contient que des fonctions pures (aucun accès au DOM), testées isolément.
 */
import type { NavigationMode } from './protocol.js';

/** Paramètres jamais recopiés dans l'URL du Core (jetons, codes OAuth…). Comparaison insensible à la casse. */
export const DEFAULT_SENSITIVE_PARAMS = [
  'token',
  'access_token',
  'id_token',
  'refresh_token',
  'code',
  'state',
  'password',
  'secret',
  'otp',
  'session',
  'sessionid',
  'auth',
  'key',
  'api_key',
  'apikey',
];

export const MAX_APP_PATH_LENGTH = 2000;
// eslint-disable-next-line no-control-regex
const SAFE_APP_PATH = /^\/(?!\/)[^\s\\\u0000-\u001f]*$/;

/** Mappage optionnel entre l'espace de chemins du Core et celui de l'application (flexibilité par app). */
export interface PathMap {
  /** Chemin affiché dans le Core (`/dashboard/x`) → chemin interne de l'application. */
  toApp?: (corePath: string) => string;
  /** Chemin interne de l'application → chemin affiché dans le Core. */
  toCore?: (appPath: string) => string;
}

export interface NavigationOptions {
  /** Route de la page dans `routes.json` (`penpot`) : le Core est sur `<base>/<route>[/sous-chemin]`. */
  route: string;
  /** `history` (défaut), `hash`, ou `none` pour désactiver (comportement opaque d'origine). */
  mode?: NavigationMode;
  /** Paramètres supplémentaires à ne jamais recopier (s'ajoutent à `DEFAULT_SENSITIVE_PARAMS`). */
  sensitiveParams?: string[];
  pathMap?: PathMap;
  /** Reçoit le titre annoncé par l'application (fil d'Ariane, titre de page). */
  onTitle?: (title: string) => void;
}

function trimSlashes(s: string): string {
  return s.replace(/^\/+|\/+$/g, '');
}

/** Chemin interne sûr (`/x?y#z`), ou `null` : jamais d'URL absolue, de `//hôte`, d'espaces ni de caractères de contrôle. */
export function normalizeAppPath(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > MAX_APP_PATH_LENGTH) return null;
  return SAFE_APP_PATH.test(input) ? input : null;
}

/** Retire les paramètres sensibles de la requête (et de la requête portée par le fragment `#/x?token=…`). */
export function stripSensitive(path: string, extra: string[] = []): string {
  const blocked = new Set([...DEFAULT_SENSITIVE_PARAMS, ...extra].map((p) => p.toLowerCase()));
  const clean = (query: string): string => {
    const kept = query
      .split('&')
      .filter((pair) => pair && !blocked.has(decodeSafe(pair.split('=')[0]).toLowerCase()));
    return kept.join('&');
  };
  const hashAt = path.indexOf('#');
  const beforeHash = hashAt === -1 ? path : path.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : path.slice(hashAt);
  const cleanHash = (() => {
    const q = hash.indexOf('?');
    if (q === -1) return hash;
    const kept = clean(hash.slice(q + 1));
    return hash.slice(0, q) + (kept ? `?${kept}` : '');
  })();
  const qAt = beforeHash.indexOf('?');
  if (qAt === -1) return beforeHash + cleanHash;
  const kept = clean(beforeHash.slice(qAt + 1));
  return beforeHash.slice(0, qAt) + (kept ? `?${kept}` : '') + cleanHash;
}

function decodeSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Sous-chemin de l'application déduit de l'URL du Core, ou `null` si le Core n'est pas sur cette page.
 * `pathname=/egen/spa/penpot/dashboard/x`, `spaBase=/egen/spa/`, `route=penpot` → `/dashboard/x` (`/` à la racine).
 */
export function coreSubpath(pathname: string, spaBase: string, route: string): string | null {
  const base = '/' + trimSlashes(spaBase);
  const prefix = (base === '/' ? '' : base) + '/' + trimSlashes(route);
  if (pathname !== prefix && !pathname.startsWith(prefix + '/')) return null;
  const rest = pathname.slice(prefix.length);
  return rest === '' ? '/' : rest;
}

/** URL du Core (chemin seul) pour un chemin d'application : `<base>/<route><chemin>`, sans `/` final superflu. */
export function buildCoreUrl(spaBase: string, route: string, appPath: string): string {
  const base = '/' + trimSlashes(spaBase);
  const prefix = (base === '/' ? '' : base) + '/' + trimSlashes(route);
  if (appPath === '/' || appPath === '') return prefix;
  return prefix + (appPath.startsWith('/') ? appPath : '/' + appPath);
}

/**
 * URL de chargement de l'iframe : l'adresse de base de l'application + le chemin interne.
 * `history` : `<origine><chemin-de-base>/<chemin>?q#h` ; `hash` : `<base>#<chemin>`.
 */
export function buildEmbedSrc(baseUrl: string, appPath: string, mode: NavigationMode): string {
  if (mode === 'none' || appPath === '/' || appPath === '') return baseUrl;
  const base = new URL(baseUrl);
  if (mode === 'hash') {
    base.hash = appPath;
    return base.href;
  }
  const hashAt = appPath.indexOf('#');
  const noHash = hashAt === -1 ? appPath : appPath.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : appPath.slice(hashAt);
  const qAt = noHash.indexOf('?');
  const pathname = qAt === -1 ? noHash : noHash.slice(0, qAt);
  const search = qAt === -1 ? '' : noHash.slice(qAt);
  const basePath = base.pathname.replace(/\/+$/, '');
  return `${base.origin}${basePath}${pathname}${search}${hash}`;
}

/** Chemin d'application → chemin affiché par le Core (sans paramètres sensibles ; `pathMap.toCore` en dernier). */
export function toCorePath(appPath: unknown, opts: Pick<NavigationOptions, 'pathMap' | 'sensitiveParams'>): string | null {
  const safe = normalizeAppPath(appPath);
  if (!safe) return null;
  const clean = stripSensitive(safe, opts.sensitiveParams);
  const mapped = opts.pathMap?.toCore ? opts.pathMap.toCore(clean) : clean;
  return normalizeAppPath(mapped);
}

/** Chemin lu dans l'URL du Core → chemin d'application (`pathMap.toApp` ; sans paramètres sensibles). */
export function toAppPath(corePath: string, opts: Pick<NavigationOptions, 'pathMap' | 'sensitiveParams'>): string | null {
  const safe = normalizeAppPath(corePath);
  if (!safe) return null;
  const clean = stripSensitive(safe, opts.sensitiveParams);
  const mapped = opts.pathMap?.toApp ? opts.pathMap.toApp(clean) : clean;
  return normalizeAppPath(mapped);
}

/** Garde-fou de débit : au plus `max` messages par fenêtre `windowMs` (History API limitée par les navigateurs). */
export function createRateLimiter(max = 40, windowMs = 1000, now: () => number = () => Date.now()) {
  const stamps: number[] = [];
  return (): boolean => {
    const t = now();
    while (stamps.length && t - stamps[0] > windowMs) stamps.shift();
    if (stamps.length >= max) return false;
    stamps.push(t);
    return true;
  };
}
