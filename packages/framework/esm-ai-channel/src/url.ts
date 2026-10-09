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
