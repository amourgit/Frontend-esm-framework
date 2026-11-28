import { CAPABILITIES, patternCovers, validateManifest, type EmbedManifest } from '@egen-civitas/esm-embed-protocol';

/** Permissions `allow` donnant accès à des capteurs ou à l'écran de l'utilisateur. */
const SENSITIVE_PERMISSIONS = new Set(['camera', 'microphone', 'geolocation', 'display-capture']);

export interface CheckIssue {
  level: 'error' | 'warn' | 'info';
  message: string;
}

export interface CheckOptions {
  /** Déclaration `egen-config.json` déjà lue. */
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

  const pub = caps.events?.publish;
  if (Array.isArray(pub)) {
    const own = `app.${m.route}.*`;
    for (const p of pub) {
      if (p === '*' || /^\*/.test(String(p))) add('error', `events.publish : le motif « ${p} » n'est pas supporté (nommer le préfixe, ex. ${own})`);
      else if (!patternCovers(own, String(p).replace(/\.\*$/, '.x'))) add('warn', `events.publish : « ${p} » sort de l'espace conseillé ${own}`);
    }
  }

  if (caps.notifications) add('info', "Notifications : le Core affiche les toasts (par défaut seul). N'affichez pas les vôtres : appelez egen.notify(toast, local) et ne rendez votre composant de toasts que si !egen.coreDisplaysNotifications");
  const asked = m.iframe;
  if (asked && ((asked.sandbox?.length ?? 0) > 0 || (asked.allow?.length ?? 0) > 0)) {
    const list = [...(asked.sandbox ?? []).map((t) => `sandbox:${t}`), ...(asked.allow ?? []).map((t) => `allow:${t}`)];
    add('info', `Droits d'iframe demandés : l'opérateur doit les approuver (grants.iframe), sinon ils seront refusés : ${list.join(', ')}`);
    const sensitive = (asked.allow ?? []).filter((t) => SENSITIVE_PERMISSIONS.has(t));
    if (sensitive.length) add('warn', `Permissions sensibles demandées (${sensitive.join(', ')}) : à justifier auprès de l'opérateur, elles ne sont jamais accordées par défaut`);
  }
  const slots = [...new Set((m.extensions ?? []).map((e) => e.slot))];
  if (slots.length) add('info', `Contributions d'extension : l'opérateur doit approuver les slots (extensions.contribute) : ${slots.join(', ')}`);
  for (const e of m.extensions ?? []) if (e.view) add('info', `Extension « ${e.name} » : la vue ${e.view} sera affichée dans une iframe du Core (frame-ancestors à autoriser pour le Shell, hauteur via navigation.resize)`);
  const discover = caps.extensions?.discover;
  if (Array.isArray(discover) && discover.some((s) => s === '*')) add('error', "extensions.discover : le motif « * » n'est pas supporté (nommer les slots)");

  if (m.technology === 'nextjs' && m.navigation.mode === 'none') add('info', 'Next.js avec navigation « none » : l’URL du Core ne reflétera pas la page courante (partage de lien, F5)');

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
    await probeDeclaration(f, m, add, { allowInsecureLocalhost: o.allowInsecureLocalhost });
  }
  return issues;
}

export const hasErrors = (issues: CheckIssue[]) => issues.some((i) => i.level === 'error');

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Voie normale (doc 17 §7) : l'app sert elle-même `<url>/egen-config.json`. On vérifie qu'il est publié, valide,
 * identique à la déclaration contrôlée, et jamais mis en cache (le Core en fige le SHA-256).
 */
async function probeDeclaration(
  f: typeof fetch,
  m: EmbedManifest,
  add: (level: CheckIssue['level'], message: string) => void,
  manifestOptions: Parameters<typeof validateManifest>[1]
): Promise<void> {
  const declared = `${m.url.replace(/\/+$/, '')}/egen-config.json`;
  try {
    const res = await f(declared, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    if (res.status === 404) {
      add('info', "/egen-config.json n'est pas publié à la racine de l'app : voie normale = l'app sert sa déclaration ; sinon l'opérateur la déclare côté Core (second recours, `declaration` dans external-apps.json)");
      return;
    }
    if (res.status >= 300) {
      add('warn', `/egen-config.json répond HTTP ${res.status} : le Core doit pouvoir le lire directement (pas de redirection)`);
      return;
    }
    let served: unknown;
    try {
      served = await res.json();
    } catch {
      add('error', '/egen-config.json publié : JSON invalide');
      return;
    }
    const result = validateManifest(served, manifestOptions);
    if (!result.ok) {
      for (const e of result.errors) add('error', `/egen-config.json publié invalide : ${e}`);
      return;
    }
    const drift = Object.keys({ ...(m as object), ...(result.manifest as object) }).filter(
      (k) => !sameJson((m as unknown as Record<string, unknown>)[k], (result.manifest as unknown as Record<string, unknown>)[k])
    );
    if (drift.length) add('warn', `La déclaration publiée diffère de celle contrôlée (champs : ${drift.join(', ')})`);
    const cache = res.headers.get('cache-control') ?? '';
    if (!/no-store|no-cache|max-age=0/i.test(cache)) add('info', "/egen-config.json sans « Cache-Control: no-store » : le Core fige son SHA-256, une version en cache provoque un rejet au démarrage");
  } catch (e) {
    add('warn', `/egen-config.json injoignable (${(e as Error).message})`);
  }
}
