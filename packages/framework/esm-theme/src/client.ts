/**
 * Client du thème : le navigateur ne parle qu'au backend du Core, à la même origine.
 *
 * Contrat (backend du Core) :
 *  - `GET  /api/theme[?app=<id>]`  → `{ styles, checksum, sources }`, avec `ETag` ; `304` si `If-None-Match` est à jour ;
 *  - `POST /api/theme/applied`     → le navigateur indique le thème réellement appliqué (audit), sans rien changer au rendu.
 *
 * L'identité (tenant, utilisateur) vient de la session côté serveur : ce client n'envoie ni tenant ni utilisateur.
 * Aucune URL absolue n'est acceptée : un chemin qui ne commence pas par une seule `/` est refusé.
 */
import type { ThemeStyles } from './theme-styles.js';

export const THEME_ENDPOINT = '/api/theme';
export const THEME_APPLIED_ENDPOINT = '/api/theme/applied';

/** Provenance d'un thème résolu, telle que renvoyée par le backend. */
export interface ResolvedThemeSources {
  scope: string;
  theme: string;
  version: number;
  overridden: boolean;
  user: string;
}

/** Thème résolu par le backend pour la session courante. */
export interface ResolvedTheme {
  styles: ThemeStyles;
  checksum: string;
  sources: ResolvedThemeSources;
}

export type FetchThemeResult =
  | { status: 200; theme: ResolvedTheme; etag: string | null }
  | { status: 304; etag: string | null };

export interface ThemeClientOptions {
  /** Chemin relatif de même origine. Défaut : `/api/theme`. */
  endpoint?: string;
  /** Identifiant d'application (`[a-z0-9][a-z0-9._-]{0,63}`), transmis en `?app=`. */
  app?: string;
  /** `ETag` déjà connu : le backend répond `304` si le thème n'a pas changé. */
  etag?: string | null;
  /** Implémentation de `fetch` (tests). Défaut : `fetch` global. */
  fetch?: typeof fetch;
  signal?: AbortSignal;
}

const APP_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const PATH_RE = /^\/(?!\/)[A-Za-z0-9/_.-]*$/;

/** Refuse tout ce qui n'est pas un chemin relatif de même origine. */
export function assertSameOriginPath(path: string): string {
  if (!PATH_RE.test(path) || path.split('/').includes('..')) {
    throw new Error(`[esm-theme] Chemin refusé (même origine uniquement) : ${JSON.stringify(path)}`);
  }
  return path;
}

function assertAppId(app: string): string {
  if (!APP_RE.test(app)) throw new Error(`[esm-theme] Identifiant d'application invalide : ${JSON.stringify(app)}`);
  return app;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Vérifie la forme de la réponse (le contenu des styles est contrôlé par le runtime avant toute écriture). */
export function parseResolvedTheme(body: unknown): ResolvedTheme {
  if (!isRecord(body) || !isRecord(body.styles) || !isRecord(body.styles.light) || !isRecord(body.styles.dark)) {
    throw new Error('[esm-theme] Réponse de thème invalide : { styles: { light, dark } } attendu');
  }
  if (typeof body.checksum !== 'string') throw new Error('[esm-theme] Réponse de thème invalide : checksum manquant');
  const s = body.sources;
  if (!isRecord(s) || typeof s.theme !== 'string' || !Number.isInteger(s.version)) {
    throw new Error('[esm-theme] Réponse de thème invalide : sources manquantes');
  }
  return {
    styles: body.styles as unknown as ThemeStyles,
    checksum: body.checksum,
    sources: {
      scope: String(s.scope ?? ''),
      theme: s.theme,
      version: s.version as number,
      overridden: s.overridden === true,
      user: String(s.user ?? ''),
    },
  };
}

/** Demande le thème de la session au backend du Core. Lève une erreur si la réponse n'est pas exploitable. */
export async function fetchTheme(options: ThemeClientOptions = {}): Promise<FetchThemeResult> {
  const doFetch = options.fetch ?? fetch;
  let url = assertSameOriginPath(options.endpoint ?? THEME_ENDPOINT);
  if (options.app !== undefined) url += `?app=${encodeURIComponent(assertAppId(options.app))}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.etag) headers['If-None-Match'] = options.etag;
  const res = await doFetch(url, { method: 'GET', headers, credentials: 'same-origin', signal: options.signal });
  const etag = res.headers.get('etag');
  if (res.status === 304) return { status: 304, etag };
  if (!res.ok) throw new Error(`[esm-theme] Le backend a répondu ${res.status} pour ${url}`);
  return { status: 200, theme: parseResolvedTheme(await res.json()), etag };
}

/**
 * Indique au backend quel thème a été réellement appliqué. Sans effet sur le rendu : n'échoue jamais
 * (renvoie `false` si l'accusé n'a pas pu être transmis) et ne transmet rien pour le thème de repli.
 */
export async function reportThemeApplied(
  theme: ResolvedTheme,
  options: { app?: string; endpoint?: string; fetch?: typeof fetch } = {},
): Promise<boolean> {
  if (theme.checksum === 'fallback') return false;
  try {
    const doFetch = options.fetch ?? fetch;
    const body: Record<string, unknown> = {
      theme: theme.sources.theme,
      version: theme.sources.version,
      checksum: theme.checksum,
    };
    if (options.app !== undefined) body.app = assertAppId(options.app);
    const res = await doFetch(assertSameOriginPath(options.endpoint ?? THEME_APPLIED_ENDPOINT), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}
