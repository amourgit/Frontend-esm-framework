// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectToEgen } from '@egen-civitas/esm-embed-client';
import { effectiveGrants } from '@egen-civitas/esm-embed-protocol';
import { createEmbedHost, type EmbedHost, type HostProviders } from './index.js';

const SHELL = 'https://shell.exemple.org';
const APP = 'https://studio.exemple.org';
const MODULE = '@acme/esm-studio-app';

let host: EmbedHost | undefined;
let posted: Array<{ message: any; origin: string; transfer?: any[] }>;
let appWin: any;

beforeEach(() => {
  (window as any).happyDOM.setURL(`${SHELL}/egen/spa/studio`);
  (window as any).getEgenSpaBase = () => '/egen/spa/';
  posted = [];
  appWin = { postMessage: (message: any, origin: string, transfer?: any[]) => posted.push({ message, origin, transfer }) };
});
afterEach(() => {
  host?.destroy();
  host = undefined;
  document.body.replaceChildren();
});

const providers: HostProviders = { locale: { get: () => 'fr' } };

function mount(extra: Partial<Parameters<typeof createEmbedHost>[0]> = {}) {
  host = createEmbedHost({ moduleName: MODULE, src: APP, grants: effectiveGrants(undefined, {}), providers, navigation: { route: 'studio' }, ...extra });
  Object.defineProperty(host.iframe, 'contentWindow', { value: appWin });
  host.mount(document.body);
  return host;
}

function fromApp(data: unknown, o: { origin?: string; source?: unknown } = {}) {
  const ev: any = new Event('message');
  ev.data = data;
  ev.origin = o.origin ?? APP;
  ev.source = 'source' in o ? o.source : appWin;
  window.dispatchEvent(ev);
}
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

describe('iframe', () => {
  it('attributs de sécurité et URL de départ', () => {
    const h = mount();
    expect(h.iframe.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin allow-forms allow-popups');
    expect(h.iframe.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(h.iframe.getAttribute('src')).toBe(APP);
    expect(document.body.contains(h.iframe)).toBe(true);
  });
  it('refuse une origine « * » ou « null »', () => {
    expect(() => createEmbedHost({ moduleName: MODULE, src: APP, allowedOrigin: '*', grants: {}, providers })).toThrow(/allowedOrigin/);
    expect(() => createEmbedHost({ moduleName: MODULE, src: APP, allowedOrigin: 'null', grants: {}, providers })).toThrow(/allowedOrigin/);
  });
  it('avertit quand le bac à sable est sans effet (même origine)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    createEmbedHost({ moduleName: MODULE, src: `${SHELL}/app`, grants: {}, providers });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  it('destroy retire l’iframe', () => {
    const h = mount();
    h.destroy();
    expect(document.body.contains(h.iframe)).toBe(false);
  });
});

describe('protocole 2', () => {
  it('load → hello (origine cible explicite) ; connect → port transféré', async () => {
    const h = mount();
    h.iframe.dispatchEvent(new Event('load'));
    const hello = posted.find((p) => p.message.message?.kind === 'hello')!;
    expect(hello.origin).toBe(APP);
    expect(hello.message).toMatchObject({ egen: 2, moduleName: MODULE });
    fromApp({ egen: 2, moduleName: MODULE, message: { kind: 'connect', nonce: hello.message.message.nonce, protocol: 2, requested: [{ id: 'locale', version: 1 }] } });
    const port = posted.find((p) => p.message.message?.kind === 'port')!;
    expect(port.transfer).toHaveLength(1);
    expect(port.message.message.granted.map((g: any) => g.id)).toEqual(['locale']);
    expect(h.connection.connected).toBe(true);
  });

  it('ignore une autre origine ou une autre source', () => {
    const h = mount();
    h.iframe.dispatchEvent(new Event('load'));
    const nonce = posted.find((p) => p.message.message?.kind === 'hello')!.message.message.nonce;
    const connect = { egen: 2, moduleName: MODULE, message: { kind: 'connect', nonce, protocol: 2, requested: [] } };
    fromApp(connect, { origin: 'https://evil.exemple.org' });
    fromApp(connect, { source: {} });
    expect(h.connection.connected).toBe(false);
    expect(posted.some((p) => p.message.message?.kind === 'port')).toBe(false);
  });

  it('canLeave : vrai si non connecté', async () => {
    expect(await mount().canLeave()).toBe(true);
  });

  it('bout en bout avec le vrai client : retour du navigateur → goto, rapport de page → URL du Core', async () => {
    const clientWin = new EventTarget();
    const h = mount();
    // relie la fenêtre de l'app (client SDK) à l'hôte : app → hôte via fromApp, hôte → app via événements
    appWin.postMessage = (message: any, _origin: string, transfer?: any[]) => {
      const ev: any = new Event('message');
      ev.data = message;
      ev.origin = SHELL;
      ev.source = parentWin;
      ev.ports = transfer ?? [];
      queueMicrotask(() => clientWin.dispatchEvent(ev));
    };
    const parentWin: any = { postMessage: (message: any) => queueMicrotask(() => fromApp(message)) };
    h.iframe.dispatchEvent(new Event('load')); // hello envoyé AVANT que l'app n'écoute : la sonde (probe) le fait renvoyer
    const client = await connectToEgen({ moduleName: MODULE, hostOrigins: [SHELL], window: clientWin as any, host: parentWin, capabilities: ['navigation'], timeoutMs: 500 });
    await tick();
    expect(client.connected).toBe(true);
    const gotos: any[] = [];
    await client.navigation.onGoto((m) => gotos.push(m));
    window.history.pushState({}, '', '/egen/spa/studio/themes/1?x=1');
    window.dispatchEvent(new Event('popstate'));
    await tick();
    expect(gotos).toEqual([{ path: '/themes/1?x=1', seq: 1 }]);
    await client.navigation.report('/themes/2', { title: 'Thème 2' });
    expect(window.location.pathname).toBe('/egen/spa/studio/themes/2');
    expect(h.iframe.title).toBe('Thème 2');
    client.close();
  });
});

describe('pont 1.1 (compatibilité)', () => {
  it('ready → init : langue et base SPA, jamais de session ni de jeton ; enveloppe egen:1', async () => {
    mount();
    fromApp({ egen: 1, moduleName: MODULE, message: { kind: 'ready' } });
    await tick();
    const init = posted.find((p) => p.message.egen === 1 && p.message.message.kind === 'init')!;
    expect(init.origin).toBe(APP);
    expect(init.message.message.payload).toMatchObject({ moduleName: MODULE, locale: 'fr', spaBase: '/egen/spa/' });
    expect(init.message.message.payload.session).toBeUndefined();
    expect(JSON.stringify(init.message)).not.toMatch(/session|token/i);
  });

  it('location → URL du Core mise à jour, sans paramètres sensibles', async () => {
    mount();
    fromApp({ egen: 1, moduleName: MODULE, message: { kind: 'location', path: '/themes/7?tab=a&token=ABC', title: 'Thème 7' } });
    expect(window.location.pathname).toBe('/egen/spa/studio/themes/7');
    expect(window.location.search).toBe('?tab=a');
    expect(host!.iframe.title).toBe('Thème 7');
  });

  it('resize et navigation interne ; chemins externes refusés', () => {
    const onNavigate = vi.fn();
    const h = mount({ onNavigate });
    fromApp({ egen: 1, moduleName: MODULE, message: { kind: 'resize', height: 733.2 } });
    expect(h.iframe.style.height).toBe('734px');
    fromApp({ egen: 1, moduleName: MODULE, message: { kind: 'navigate', to: '//evil.com' } });
    fromApp({ egen: 1, moduleName: MODULE, message: { kind: 'navigate', to: '/dashboard' } });
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('désactivable : legacy:false', async () => {
    mount({ legacy: false });
    fromApp({ egen: 1, moduleName: MODULE, message: { kind: 'ready' } });
    await tick();
    expect(posted.some((p) => p.message.egen === 1)).toBe(false);
  });

  it('messages d’une autre origine ignorés', async () => {
    mount();
    fromApp({ egen: 1, moduleName: MODULE, message: { kind: 'ready' } }, { origin: 'https://evil.exemple.org' });
    await tick();
    expect(posted).toHaveLength(0);
  });
});
