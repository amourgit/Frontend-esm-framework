import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, normalize, sep } from 'node:path';
import type { AddressInfo } from 'node:net';
import { validateManifest, CAPABILITY_IDS, CAPABILITIES, type ApprovedGrants, type EmbedManifest } from '@egen-civitas/esm-embed-protocol';

export interface SimulatorOptions {
  /** URL de l'app embarquée (ex. `http://localhost:3000`). */
  app: string;
  port?: number;
  host?: string;
  /** Déclaration `egen-config.json` de l'app (objet déjà lu). Sans manifeste : l'opérateur simulé définit seul. */
  manifest?: unknown;
  /** Approuver toutes les capacités demandées (défaut) ou seulement celles « par défaut » (`strict`). */
  strict?: boolean;
}

export interface Simulator {
  url: string;
  server: Server;
  close(): Promise<void>;
}

const require_ = createRequire(import.meta.url);
const pkgDist = (name: string) => dirname(require_.resolve(name));

const MIME: Record<string, string> = { '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };

function approvedFor(manifest: EmbedManifest | undefined, strict: boolean): ApprovedGrants {
  if (strict || !manifest) return {};
  // « tout approuver » : chaque capacité demandée est approuvée avec sa propre configuration (ceiling = demande)
  const out: ApprovedGrants = {};
  for (const id of CAPABILITY_IDS) {
    const asked = manifest.capabilities[id];
    if (asked !== undefined && !CAPABILITIES[id].defaultGrant) out[id] = asked;
  }
  // droits d'iframe : la demande de l'app est approuvée telle quelle (le simulateur joue l'opérateur indulgent)
  if (manifest.iframe) out.iframe = manifest.iframe;
  return out;
}

export async function startSimulator(o: SimulatorOptions): Promise<Simulator> {
  const appUrl = new URL(o.app);
  let manifest: EmbedManifest | undefined;
  if (o.manifest !== undefined) {
    const r = validateManifest(o.manifest, { allowInsecureLocalhost: true });
    if (!r.ok) throw new Error(`Manifeste invalide :\n- ${r.errors.join('\n- ')}`);
    manifest = r.manifest;
  }
  const config = {
    app: appUrl.href,
    moduleName: manifest?.name ?? '@acme/esm-sim-app',
    manifestCapabilities: manifest?.capabilities,
    manifestIframe: manifest?.iframe,
    approved: approvedFor(manifest, !!o.strict),
    extensions: { 'topbar-nav-slot': [{ name: 'nav-demo', moduleName: '@egen/esm-demo-app', order: 1, meta: { label: 'Démo', route: 'demo' } }] },
  };
  const roots: Record<string, string> = { protocol: pkgDist('@egen-civitas/esm-embed-protocol'), host: pkgDist('@egen-civitas/esm-embed-host') };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const send = (code: number, body: string | Buffer, type = 'text/plain; charset=utf-8') => {
      res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      res.end(body);
    };
    try {
      if (url.pathname === '/') return send(200, PAGE, 'text/html; charset=utf-8');
      if (url.pathname === '/api/config') return send(200, JSON.stringify(config), MIME['.json']);
      const m = /^\/vendor\/(protocol|host)\/(.+)$/.exec(url.pathname);
      if (m) {
        const root = roots[m[1]];
        const file = normalize(join(root, m[2]));
        if (!file.startsWith(root + sep) || !file.endsWith('.js')) return send(404, 'Introuvable');
        return send(200, await readFile(file), MIME['.js']);
      }
      send(404, 'Introuvable');
    } catch {
      send(404, 'Introuvable');
    }
  });
  await new Promise<void>((resolve) => server.listen(o.port ?? 4100, o.host ?? '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  return { url: `http://${o.host ?? '127.0.0.1'}:${addr.port}`, server, close: () => new Promise((r) => server.close(() => r())) };
}

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>EGEN — simulateur de Shell</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<script type="importmap">{"imports":{"@egen-civitas/esm-embed-protocol":"/vendor/protocol/index.js"}}</script>
<style>
:root{color-scheme:light dark;--b:#d0d7de;font-family:system-ui,sans-serif}
body{margin:0;display:grid;grid-template-columns:1fr 360px;height:100vh}
#stage{min-width:0;display:flex}#stage iframe{flex:1;border:0}
aside{border-left:1px solid var(--b);padding:12px;overflow:auto;font-size:13px}
button{margin:2px 4px 2px 0;padding:4px 8px;cursor:pointer}
pre{white-space:pre-wrap;word-break:break-word;font-size:12px;max-height:50vh;overflow:auto;border:1px solid var(--b);padding:6px;border-radius:6px}
.toast{border:1px solid var(--b);border-radius:6px;padding:6px;margin:4px 0}
h1{font-size:14px;margin:0 0 8px}h2{font-size:12px;margin:12px 0 4px;text-transform:uppercase;opacity:.7}
</style></head><body>
<div id="stage"></div>
<aside><h1>Simulateur de Shell EGEN</h1>
<div id="info"></div>
<h2>Pousser vers l'app</h2>
<button id="locale">Langue fr/en</button><button id="event">Événement core.sim.ping</button><button id="ext">Changer les extensions de topbar-nav-slot</button>
<h2>Notifications</h2><div id="toasts"></div>
<h2>Journal des échanges</h2><pre id="log"></pre></aside>
<script type="module">
import { effectiveGrants, effectiveIframe } from '@egen-civitas/esm-embed-protocol';
import { createEmbedHost } from '/vendor/host/index.js';
const cfg = await (await fetch('/api/config')).json();
const $ = (id) => document.getElementById(id);
const log = (...a) => { $('log').textContent = new Date().toLocaleTimeString() + ' ' + a.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' ') + '\\n' + $('log').textContent; };
const watch = (v) => { const s = new Set(); return { get: () => v, subscribe: (cb) => (s.add(cb), () => s.delete(cb)), set: (n) => { v = n; s.forEach((f) => f(n)); } }; };
const locale = watch('fr'), tenant = watch({ id: 'sim-tenant' }), conf = watch({});
const topics = new Map(), seenToasts = new Set();
const extState = new Map(Object.entries(cfg.extensions)), extSubs = new Map();
const wrap = (cap, p) => Object.fromEntries(Object.entries(p).map(([k, f]) => [k, typeof f === 'function' ? (...a) => { log('←', cap + '.' + k, a); return f(...a); } : f]));
const providers = {
  locale: wrap('locale', locale), tenant: wrap('tenant', tenant), config: wrap('config', conf),
  flags: wrap('flags', { isEnabled: () => true }),
  extensions: { list: (slot) => { log('← extensions.list', slot); return extState.get(slot) || []; }, subscribe: (slot, cb) => { const s = extSubs.get(slot) || new Set(); s.add(cb); extSubs.set(slot, s); return () => s.delete(cb); } },
  events: { publish: (t, p, c) => { log('← events.publish', t, p, 'de', c.moduleName); (topics.get(t) || []).forEach((f) => f(p)); }, subscribe: (t, cb) => { log('← events.subscribe', t); const l = topics.get(t) || []; l.push(cb); topics.set(t, l); return () => topics.set(t, (topics.get(t) || []).filter((f) => f !== cb)); } },
  notifications: { show: (n, c) => { log('← notifications.show', n, 'de', c.moduleName); if (n.id && seenToasts.has(n.id)) return false; if (n.id) seenToasts.add(n.id); const d = document.createElement('div'); d.className = 'toast'; d.textContent = '[' + n.kind + '] ' + cfg.moduleName + ' · ' + n.title + (n.subtitle ? ' — ' + n.subtitle : ''); $('toasts').prepend(d); return true; } },
  dialogs: { confirm: (d) => { log('← dialogs.confirm', d); return confirm(d.title + '\\n\\n' + d.message); } },
  telemetry: { log: (...a) => log('← telemetry.log', a.slice(0, 3)), metric: (...a) => log('← telemetry.metric', a.slice(0, 3)) },
};
const grants = effectiveGrants(cfg.manifestCapabilities, cfg.approved);
const iframe = effectiveIframe(cfg.manifestIframe, cfg.approved.iframe);
$('info').innerHTML = '<b>App</b> ' + cfg.app + '<br><b>Module</b> ' + cfg.moduleName + '<br><b>hostOrigins à déclarer dans l’app</b> <code>' + location.origin + '</code><br><b>Capacités accordées</b> ' + Object.keys(grants).join(', ') + '<br><b>Droits d’iframe accordés</b> ' + (iframe.sandbox.concat(iframe.allow).join(', ') || 'socle seul');
const host = createEmbedHost({ moduleName: cfg.moduleName, src: cfg.app, grants, iframe, providers, onConnect: (g, d) => log('✔ connecté', { accordées: g.map((x) => x.id), refusées: d }), onClose: (r) => log('✖ fermé', r) });
host.mount($('stage'));
$('locale').onclick = () => locale.set(locale.get() === 'fr' ? 'en' : 'fr');
$('event').onclick = () => (topics.get('core.sim.ping') || []).forEach((f) => f({ at: Date.now() }));
$('ext').onclick = () => { const n = [{ name: 'nav-' + Math.floor(Math.random() * 100), moduleName: '@egen/esm-demo-app', meta: { label: 'Nouvelle extension' } }]; extState.set('topbar-nav-slot', n); (extSubs.get('topbar-nav-slot') || []).forEach((f) => f(n)); };
</script></body></html>`;
