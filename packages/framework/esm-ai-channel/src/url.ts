// Résolution de l'URL du canal à partir de `backend.channelUrl`.

export interface UrlEnv {
  egenBase?: string;
  location?: { protocol: string; host: string };
}

function currentEnv(): UrlEnv {
  const w = typeof window !== 'undefined' ? (window as unknown as { egenBase?: string; location?: Location }) : undefined;
  return { egenBase: w?.egenBase, location: w?.location };
}

/**
 * - `${egenBase}` est remplacé par `window.egenBase`
 * - `ws(s)://` conservé, `http(s)://` converti en `ws(s)://`
 * - chemin relatif → `ws(s)://<host courant><chemin>`
 */
export function resolveChannelUrl(channelUrl: string, env: UrlEnv = currentEnv()): string {
  const base = (env.egenBase ?? '').replace(/\/$/, '');
  const url = channelUrl.replace('${egenBase}', base).trim();

  if (/^wss?:\/\//i.test(url)) return url;
  if (/^https?:\/\//i.test(url)) return url.replace(/^http/i, 'ws');

  const loc = env.location;
  if (!loc) return url;
  const scheme = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${loc.host}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ─── Garde-fou sur la destination du canal ────────────────────────────────────
//
// La session (cookies) et les ordres du backend transitent par ce canal : on refuse une destination
// en clair (hors machine locale) et, si l'exploitant l'a défini, hors de la liste d'hôtes épinglés.

export interface ChannelUrlPolicy {
  /** Autoriser `ws://` vers un hôte non local (déconseillé). */
  allowInsecure?: boolean;
  /** Hôtes autorisés : « api.exemple.ga », « api.exemple.ga:8443 », « *.exemple.ga ». Vide/absent = pas d'épinglage. */
  allowedHosts?: readonly string[];
}

export class ChannelUrlRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChannelUrlRejectedError';
  }
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function hostMatches(entry: string, url: URL): boolean {
  const pattern = entry.trim().toLowerCase();
  if (!pattern) return false;
  const hasPort = /:\d+$/.test(pattern);
  const subject = hasPort ? url.host.toLowerCase() : url.hostname.toLowerCase();
  if (pattern.startsWith('*.')) return subject.endsWith(pattern.slice(1)) && subject.length > pattern.length - 1;
  return subject === pattern;
}

/** Retourne l'URL si elle respecte la politique, sinon lève `ChannelUrlRejectedError` (message exploitable par l'exploitant). */
export function assertChannelUrlAllowed(rawUrl: string, policy: ChannelUrlPolicy = {}): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ChannelUrlRejectedError(`URL du canal IA invalide : « ${rawUrl} ».`);
  }
  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
    throw new ChannelUrlRejectedError(`Le canal IA doit utiliser ws(s):// (reçu : ${url.protocol}//).`);
  }
  if (url.protocol === 'ws:' && !LOOPBACK_HOSTS.has(url.hostname.toLowerCase()) && !policy.allowInsecure) {
    throw new ChannelUrlRejectedError(
      `Canal IA en clair (ws://) refusé vers « ${url.host} » : utiliser wss://, ou EGEN_AI_ALLOW_INSECURE_CHANNEL=true (déconseillé).`,
    );
  }
  const allowed = policy.allowedHosts?.filter((h) => h.trim() !== '') ?? [];
  if (allowed.length > 0 && !allowed.some((entry) => hostMatches(entry, url))) {
    throw new ChannelUrlRejectedError(
      `Hôte du canal IA « ${url.host} » absent de EGEN_AI_CHANNEL_ALLOWED_HOSTS (${allowed.join(', ')}).`,
    );
  }
  return rawUrl;
}
