import { CAPABILITIES, FORBIDDEN_SESSION_FIELDS, patternCovers, validateManifest, type EmbedManifest } from '@egen-civitas/esm-embed-protocol';

export interface CheckIssue {
  level: 'error' | 'warn' | 'info';
  message: string;
}

export interface CheckOptions {
  /** Manifeste `egen-app.json` déjà lu. */
  manifest: unknown;
  /** Origine du Shell EGEN (ex. `https://egen.exemple.org`) : active le contrôle d'intégration en iframe. */
  shellOrigin?: string;
  /** Interroge réellement l'URL de l'app (en-têtes `frame-ancestors`, `X-Frame-Options`). */
  probe?: boolean;
  allowInsecureLocalhost?: boolean;
  fetchImpl?: typeof fetch;
}

/** Vérificateur d'app embarquée (`egen-embed-check`) : manifeste, hygiène des capacités demandées, intégrabilité en iframe. */
export async function checkEmbedApp(o: CheckOptions): Promise<CheckIssue[]> {
  const issues: CheckIssue[] = [];
  const add = (level: CheckIssue['level'], message: string) => issues.push({ level, message });

  const r = validateManifest(o.manifest, { allowInsecureLocalhost: o.allowInsecureLocalhost });
  if (!r.ok) {
    for (const e of r.errors) add('error', e);
    return issues;
  }
  const m: EmbedManifest = r.manifest;
  const caps = m.capabilities as Record<string, Record<string, unknown>>;

  const needApproval = Object.keys(caps).filter((id) => !CAPABILITIES[id as keyof typeof CAPABILITIES].defaultGrant);
  if (needApproval.length) add('info', `Capacités à faire approuver par l'opérateur (grants) : ${needApproval.join(', ')}`);

  const fields = caps.session?.fields;
  if (Array.isArray(fields)) for (const f of fields) if (FORBIDDEN_SESSION_FIELDS.includes(String(f).split('.')[0])) add('error', `session.fields : « ${f} » ne sera jamais transmis (identifiant de session ou jeton)`);

  const pub = caps.events?.publish;
  if (Array.isArray(pub)) {
    const own = `app.${m.route}.*`;
    for (const p of pub) {
      if (p === '*' || /^\*/.test(String(p))) add('error', `events.publish : le motif « ${p} » n'est pas supporté (nommer le préfixe, ex. ${own})`);
      else if (!patternCovers(own, String(p).replace(/\.\*$/, '.x'))) add('warn', `events.publish : « ${p} » sort de l'espace conseillé ${own}`);
    }
  }
  const tools = caps['ai-tools']?.tools;
  if (Array.isArray(tools) && tools.some((t) => !String(t).includes('.'))) add('warn', 'ai-tools.tools : préférer des noms d’outils préfixés (ex. studio.apply) pour éviter les collisions');

  if (caps.api && !(Array.isArray(caps.api.paths) && caps.api.paths.length) && !(Array.isArray(caps.api.hosts) && caps.api.hosts.length)) add('warn', 'api : ni paths ni hosts demandés : aucun appel ne sera possible (deny-by-default)');
  const apiPaths = caps.api?.paths;
  if (Array.isArray(apiPaths)) for (const p of apiPaths) if (p === '/*' || p === '*') add('warn', `api.paths : « ${p} » ouvre toute l'API du Core avec la session de l'utilisateur ; nommer les chemins nécessaires`);
  const hosts = caps.api?.hosts;
  if (Array.isArray(hosts)) for (const h of hosts) if (!/^https:\/\//i.test(String(h))) add('error', `api.hosts : « ${h} » doit être une origine https`);

  if (m.technology === 'nextjs' && m.navigation.mode === 'none') add('info', 'Next.js avec navigation « none » : l’URL du Core ne reflétera pas la page courante (partage de lien, F5)');
  if (!caps.lifecycle && !caps.navigation) add('info', 'Aucune capacité navigation/lifecycle demandée : l’app ne pourra ni redimensionner l’iframe ni signaler qu’elle est prête (valeurs par défaut accordées si utilisées)');

  if (o.probe) {
    const f = o.fetchImpl ?? fetch;
    try {
      const res = await f(m.url, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
      if (res.status >= 400) add('warn', `L'URL de l'app répond HTTP ${res.status}`);
      if (res.status >= 300 && res.status < 400) add('info', `L'URL de l'app redirige (HTTP ${res.status}) : vérifier que la cible reste dans la même origine`);
      const xfo = res.headers.get('x-frame-options');
      const csp = res.headers.get('content-security-policy') ?? '';
      const fa = /frame-ancestors\s+([^;]*)/i.exec(csp)?.[1]?.trim();
      if (xfo && /deny|sameorigin/i.test(xfo) && !fa) add('error', `X-Frame-Options: ${xfo} interdit l'intégration en iframe par le Shell (utiliser CSP frame-ancestors)`);
      else if (fa !== undefined) {
        const tokens = fa.split(/\s+/);
        if (o.shellOrigin && !tokens.includes('*') && !tokens.includes(o.shellOrigin)) add('error', `CSP frame-ancestors (${fa}) n'autorise pas le Shell ${o.shellOrigin}`);
        if (tokens.includes('*')) add('warn', 'CSP frame-ancestors « * » : n’importe quel site peut intégrer l’app (clickjacking) ; nommer l’origine du Shell');
        if (tokens.includes("'none'")) add('error', "CSP frame-ancestors 'none' : intégration impossible");
      } else add('warn', 'Aucune restriction frame-ancestors : l’app peut être intégrée par n’importe quel site (clickjacking) ; limiter à l’origine du Shell');
    } catch (e) {
      add('warn', `URL de l'app injoignable (${(e as Error).message})`);
    }
  }
  return issues;
}

export const hasErrors = (issues: CheckIssue[]) => issues.some((i) => i.level === 'error');
