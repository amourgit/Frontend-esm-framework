import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';

const m = vi.hoisted(() => ({ session: undefined as any }));
vi.mock('@egen-civitas/esm-api', () => ({ getSessionStore: () => m.session }));
vi.mock('@egen-civitas/esm-config', () => ({}));
vi.mock('@egen-civitas/esm-extensions', () => ({}));
vi.mock('@egen-civitas/esm-feature-flags', () => ({}));

import { getEmbedLifecycle, getSyncLifecycle, isSafeInternalPath, pickFields, DEFAULT_SESSION_FIELDS, wrap } from './index.js';
import { createEgenBridge } from './client.js';

const ORIGIN = 'https://next.exemple.org';
const opts = { moduleName: '@acme/next-app', featureName: 'next', url: `${ORIGIN}/app`, minHeight: 300 };

const fakeWin = () => ({ postMessage: vi.fn() });
function post(data: unknown, source: unknown, origin = ORIGIN) {
  window.dispatchEvent(new MessageEvent('message', { data, origin, source: source as any }));
}

beforeEach(() => {
  // happy-dom signale « chargement d'iframe désactivé » : voulu ici (la fenêtre de l'iframe est simulée)
  vi.spyOn(console, 'error').mockImplementation(() => {});
  m.session = createStore(() => ({ loaded: false, session: null as any }));
  (window as any).getEgenSpaBase = () => '/egen/spa/';
  (window as any).i18next = { language: 'fr', on: vi.fn(), off: vi.fn() };
  (window as any).singleSpaNavigate = vi.fn();
});
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('utilitaires du protocole', () => {
  it('pickFields : chemins pointés, jamais de sessionId par défaut', () => {
    const s = { authenticated: true, sessionId: 'SECRET', locale: 'fr', user: { uuid: 'u', display: 'Ada', username: 'ada', userProperties: { x: 1 } } };
    expect(pickFields(s, DEFAULT_SESSION_FIELDS)).toEqual({ authenticated: true, locale: 'fr', user: { uuid: 'u', display: 'Ada', username: 'ada' } });
    expect(JSON.stringify(pickFields(s, DEFAULT_SESSION_FIELDS))).not.toContain('SECRET');
  });
  it('isSafeInternalPath', () => {
    for (const ok of ['/accueil', '/a/b?x=1', '/']) expect(isSafeInternalPath(ok)).toBe(true);
    for (const ko of ['//evil.com', 'https://evil.com', 'javascript:alert(1)', 'accueil', '/a b', '/\\evil', 42, undefined]) expect(isSafeInternalPath(ko)).toBe(false);
  });
});

describe('côté Shell : getEmbedLifecycle', () => {
  async function mount(extra: Record<string, any> = {}) {
    const lc: any = getEmbedLifecycle({ ...opts, ...extra });
    const el = document.createElement('div');
    el.id = 'single-spa-application:n-page-0';
    document.body.appendChild(el);
    const props = { name: 'n-page-0' };
    await lc.bootstrap(props);
    await lc.mount(props);
    const iframe = el.querySelector('iframe') as HTMLIFrameElement;
    const win = fakeWin();
    Object.defineProperty(iframe, 'contentWindow', { value: win, configurable: true });
    return { lc, el, iframe, win, props };
  }

  it('monte une iframe sandboxée, titrée, avec hauteur minimale', async () => {
    const { iframe } = await mount();
    expect(iframe.getAttribute('src')).toBe(`${ORIGIN}/app`);
    expect(iframe.getAttribute('sandbox')).toContain('allow-scripts');
    expect(iframe.title).toBe('next');
    expect(iframe.style.minHeight).toBe('300px');
  });

  it('prêt → envoie init à l’origine exacte, avec session filtrée', async () => {
    const { win } = await mount();
    m.session.setState({ loaded: true, session: { authenticated: true, sessionId: 'SECRET', user: { uuid: 'u', display: 'Ada', username: 'ada', secret: 1 } } });
    post(wrap('@acme/next-app', { kind: 'ready' }), win);
    expect(win.postMessage).toHaveBeenCalledTimes(1);
    const [data, target] = win.postMessage.mock.calls[0];
    expect(target).toBe(ORIGIN);
    expect(data.message.kind).toBe('init');
    expect(data.message.payload).toMatchObject({ moduleName: '@acme/next-app', locale: 'fr', spaBase: '/egen/spa/' });
    expect(data.message.payload.session).toEqual({ authenticated: true, user: { uuid: 'u', display: 'Ada', username: 'ada' } });
    expect(JSON.stringify(data)).not.toContain('SECRET');
  });

  it('relaie les changements de session après « prêt »', async () => {
    const { win } = await mount();
    post(wrap('@acme/next-app', { kind: 'ready' }), win);
    win.postMessage.mockClear();
    m.session.setState({ loaded: true, session: { authenticated: true, user: { uuid: 'u2', display: 'Bob', username: 'bob' } } });
    expect(win.postMessage).toHaveBeenCalledOnce();
    expect(win.postMessage.mock.calls[0][0].message).toMatchObject({ kind: 'session', session: { user: { display: 'Bob' } } });
  });

  it('ignore les messages d’une autre origine, d’une autre fenêtre, d’un autre module ou mal formés', async () => {
    const onNavigate = vi.fn();
    const { win } = await mount({ onNavigate });
    const nav = wrap('@acme/next-app', { kind: 'navigate', to: '/x' });
    post(nav, win, 'https://evil.example');
    post(nav, fakeWin());
    post(wrap('@autre/module', { kind: 'navigate', to: '/x' }), win);
    post({ egen: 2, moduleName: '@acme/next-app', message: { kind: 'navigate', to: '/x' } }, win);
    post('texte', win);
    post(null, win);
    expect(onNavigate).not.toHaveBeenCalled();
    post(nav, win);
    expect(onNavigate).toHaveBeenCalledWith('/x');
  });

  it('navigation : chemins internes seulement ; défaut = singleSpaNavigate(spaBase + chemin)', async () => {
    const { win } = await mount();
    post(wrap('@acme/next-app', { kind: 'navigate', to: '//evil.com' }), win);
    post(wrap('@acme/next-app', { kind: 'navigate', to: 'https://evil.com' }), win);
    expect((window as any).singleSpaNavigate).not.toHaveBeenCalled();
    post(wrap('@acme/next-app', { kind: 'navigate', to: '/accueil' }), win);
    expect((window as any).singleSpaNavigate).toHaveBeenCalledWith('/egen/spa/accueil');
  });

  it('resize et titre', async () => {
    const { win, iframe } = await mount();
    post(wrap('@acme/next-app', { kind: 'resize', height: 812.4 }), win);
    expect(iframe.style.height).toBe('813px');
    post(wrap('@acme/next-app', { kind: 'resize', height: -5 }), win);
    post(wrap('@acme/next-app', { kind: 'resize', height: Number.NaN }), win);
    expect(iframe.style.height).toBe('813px');
    post(wrap('@acme/next-app', { kind: 'title', title: 'Tableau de bord' }), win);
    expect(iframe.title).toBe('Tableau de bord');
  });

  it('démontage : iframe retirée, plus aucun message traité', async () => {
    const onNavigate = vi.fn();
    const { lc, el, win, props } = await mount({ onNavigate });
    await lc.unmount(props);
    expect(el.querySelector('iframe')).toBeNull();
    post(wrap('@acme/next-app', { kind: 'navigate', to: '/x' }), win);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('refuse une origine « * » et des options invalides', async () => {
    const lc: any = getEmbedLifecycle({ ...opts, allowedOrigin: '*' });
    const el = document.createElement('div');
    el.id = 'single-spa-application:x-0';
    document.body.appendChild(el);
    expect(() => lc.mount({ name: 'x-0' })).toThrow(/origine explicite/);
    expect(() => getEmbedLifecycle({ moduleName: 'x' } as any)).toThrow('Invalid options');
  });

  it('avertit si l’application embarquée a la même origine que le Shell avec scripts + même origine', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await mount({ url: `${window.location.origin}/app` });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('bac à sable est sans effet'));
  });

  it('getSyncLifecycle : fonction → promesse de lifecycles', async () => {
    const lc: any = await getSyncLifecycle(opts)();
    expect(typeof lc.mount).toBe('function');
  });
});

describe('côté application : createEgenBridge', () => {
  const HOST = 'https://shell.exemple.org';
  let host: ReturnType<typeof fakeWin>;
  beforeEach(() => {
    host = fakeWin();
    Object.defineProperty(window, 'parent', { value: host, configurable: true });
  });
  afterEach(() => {
    Object.defineProperty(window, 'parent', { value: window, configurable: true });
  });
  const make = () => createEgenBridge({ moduleName: '@acme/next-app', allowedHostOrigins: [HOST] });

  it('annonce « prêt » à l’origine autorisée, reçoit init puis les mises à jour', async () => {
    const b = make();
    expect(host.postMessage).toHaveBeenCalledWith(wrap('@acme/next-app', { kind: 'ready' }), HOST);
    const states: any[] = [];
    b.subscribe((s) => states.push(s));
    post(wrap('@acme/next-app', { kind: 'init', payload: { moduleName: '@acme/next-app', locale: 'fr', spaBase: '/s/', session: { authenticated: true } } }), host, HOST);
    await expect(b.ready).resolves.toMatchObject({ locale: 'fr' });
    post(wrap('@acme/next-app', { kind: 'session', session: { authenticated: false } }), host, HOST);
    post(wrap('@acme/next-app', { kind: 'locale', locale: 'en' }), host, HOST);
    expect(b.getState()).toMatchObject({ locale: 'en', session: { authenticated: false }, spaBase: '/s/' });
    expect(states).toHaveLength(3);
    b.destroy();
  });

  it('ignore une autre origine, une autre fenêtre, un autre module', () => {
    const b = make();
    post(wrap('@acme/next-app', { kind: 'locale', locale: 'en' }), host, 'https://evil.example');
    post(wrap('@acme/next-app', { kind: 'locale', locale: 'en' }), fakeWin(), HOST);
    post(wrap('@autre', { kind: 'locale', locale: 'en' }), host, HOST);
    expect(b.getState()).toEqual({});
    b.destroy();
  });

  it('navigate / resize / title : enveloppe + origine du Shell', () => {
    const b = make();
    host.postMessage.mockClear();
    b.navigate('/accueil');
    b.setHeight(500);
    b.setTitle('Titre');
    expect(host.postMessage.mock.calls.map(([d, o]) => [d.message, o])).toEqual([
      [{ kind: 'navigate', to: '/accueil' }, HOST],
      [{ kind: 'resize', height: 500 }, HOST],
      [{ kind: 'title', title: 'Titre' }, HOST],
    ]);
    b.destroy();
  });

  it('après destroy : plus d’écoute', () => {
    const b = make();
    b.destroy();
    post(wrap('@acme/next-app', { kind: 'locale', locale: 'en' }), host, HOST);
    expect(b.getState()).toEqual({});
  });

  it('refuse « * », une liste vide, et l’exécution hors iframe', () => {
    expect(() => createEgenBridge({ moduleName: 'a', allowedHostOrigins: ['*'] })).toThrow(/jamais/);
    expect(() => createEgenBridge({ moduleName: 'a', allowedHostOrigins: [] })).toThrow(/au moins une origine/);
    Object.defineProperty(window, 'parent', { value: window, configurable: true });
    expect(() => make()).toThrow(/dans une iframe/);
  });

  it('autoResize annonce la hauteur du document', () => {
    let cb: () => void = () => {};
    (globalThis as any).ResizeObserver = class { constructor(f: () => void) { cb = f; } observe() {} disconnect() {} };
    const b = make();
    host.postMessage.mockClear();
    const stop = b.autoResize();
    cb();
    expect(host.postMessage.mock.calls[0][0].message.kind).toBe('resize');
    stop();
    b.destroy();
  });
});
