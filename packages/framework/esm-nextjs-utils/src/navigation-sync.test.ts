import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';

const m = vi.hoisted(() => ({ session: undefined as any }));
vi.mock('@egen-civitas/esm-api', () => ({ getSessionStore: () => m.session }));
vi.mock('@egen-civitas/esm-config', () => ({}));
vi.mock('@egen-civitas/esm-extensions', () => ({}));
vi.mock('@egen-civitas/esm-feature-flags', () => ({}));

import { getEmbedLifecycle } from './index.js';

const ORIGIN = 'https://next.exemple.org';
const base = { moduleName: '@acme/next-app', featureName: 'next', url: `${ORIGIN}/app`, minHeight: 300 };
const nav = { route: 'next', mode: 'history' as const };
const sent = (win: { postMessage: any }) => win.postMessage.mock.calls.map((c: any[]) => c[0].message);
const post = (data: unknown, source: unknown, origin = ORIGIN) =>
  window.dispatchEvent(new MessageEvent('message', { data, origin, source: source as any }));
const env = (message: unknown) => ({ egen: 1, moduleName: base.moduleName, message });
const coreAt = (url: string) => window.history.replaceState(null, '', url);

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  m.session = createStore(() => ({ loaded: false, session: null as any }));
  (window as any).getEgenSpaBase = () => '/egen/spa/';
  (window as any).i18next = { language: 'fr', on: vi.fn(), off: vi.fn() };
  (window as any).singleSpaNavigate = vi.fn();
  coreAt('/egen/spa/next');
});
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

let counter = 0;
async function mount(extra: Record<string, any> = {}) {
  const name = `n-page-${counter++}`;
  const lc: any = getEmbedLifecycle({ ...base, ...extra });
  const el = document.createElement('div');
  el.id = `single-spa-application:${name}`;
  document.body.appendChild(el);
  const props = { name };
  await lc.bootstrap(props);
  await lc.mount(props);
  const iframe = el.querySelector('iframe') as HTMLIFrameElement;
  const win = { postMessage: vi.fn() };
  Object.defineProperty(iframe, 'contentWindow', { value: win, configurable: true });
  return { lc, iframe, win, props };
}

describe('Shell : navigation partagée', () => {
  it('actualisation : le chemin du Core devient celui de l\'iframe (paramètres sensibles retirés)', async () => {
    coreAt('/egen/spa/next/dash/x?team=1&token=SECRET#frag');
    const { iframe } = await mount({ navigation: nav });
    expect(iframe.src).toBe(`${ORIGIN}/app/dash/x?team=1#frag`);
  });

  it('racine du Core → racine de l\'application ; sans option → comportement d\'origine', async () => {
    expect((await mount({ navigation: nav })).iframe.src).toBe(`${ORIGIN}/app`);
    coreAt('/egen/spa/next/dash');
    expect((await mount()).iframe.src).toBe(`${ORIGIN}/app`);
    expect((await mount({ navigation: { ...nav, mode: 'none' } })).iframe.src).toBe(`${ORIGIN}/app`);
  });

  it('mode hash', async () => {
    coreAt('/egen/spa/next/dashboard/recent?team-id=1');
    const { iframe } = await mount({ navigation: { ...nav, mode: 'hash' } });
    expect(iframe.src).toBe(`${ORIGIN}/app#/dashboard/recent?team-id=1`);
  });

  it('location : met à jour l\'URL du Core (pushState, ou replaceState si demandé)', async () => {
    const { win } = await mount({ navigation: nav });
    const push = vi.spyOn(window.history, 'pushState');
    const replace = vi.spyOn(window.history, 'replaceState');
    post(env({ kind: 'location', path: '/dash/x?team=1&token=S' }), win);
    expect(window.location.pathname + window.location.search).toBe('/egen/spa/next/dash/x?team=1');
    expect(push).toHaveBeenCalledTimes(1);
    post(env({ kind: 'location', path: '/dash/y', replace: true }), win);
    expect(window.location.pathname).toBe('/egen/spa/next/dash/y');
    expect(replace).toHaveBeenCalledTimes(1);
    post(env({ kind: 'location', path: '/' }), win);
    expect(window.location.pathname).toBe('/egen/spa/next');
  });

  it('location : refuse chemins dangereux, mauvaise origine/source, sans option de navigation', async () => {
    const { win } = await mount({ navigation: nav });
    for (const path of ['//evil.org', 'https://evil.org', 'x', 42]) post(env({ kind: 'location', path }), win);
    post(env({ kind: 'location', path: '/ok' }), win, 'https://evil.org');
    post(env({ kind: 'location', path: '/ok' }), { postMessage: vi.fn() });
    expect(window.location.pathname).toBe('/egen/spa/next');
    const plain = await mount();
    post(env({ kind: 'location', path: '/ok' }), plain.win);
    expect(window.location.pathname).toBe('/egen/spa/next');
  });

  it('pathMap : traduit dans les deux sens', async () => {
    const pathMap = { toApp: (p: string) => p.replace(/^\/studio/, '/workspace'), toCore: (p: string) => p.replace(/^\/workspace/, '/studio') };
    coreAt('/egen/spa/next/studio/1');
    const { iframe, win } = await mount({ navigation: { ...nav, pathMap } });
    expect(iframe.src).toBe(`${ORIGIN}/app/workspace/1`);
    post(env({ kind: 'location', path: '/workspace/2' }), win);
    expect(window.location.pathname).toBe('/egen/spa/next/studio/2');
  });

  it('retour/avance du Core → goto vers l\'application ; pas de boucle sur ses propres changements', async () => {
    const { win } = await mount({ navigation: nav });
    post(env({ kind: 'ready' }), win);
    win.postMessage.mockClear();
    post(env({ kind: 'location', path: '/a' }), win); // l'app navigue : le Core suit
    window.dispatchEvent(new Event('single-spa:routing-event'));
    expect(sent(win).filter((x: any) => x.kind === 'goto')).toHaveLength(0);
    coreAt('/egen/spa/next/b?q=1'); // l'utilisateur change l'URL du Core
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new Event('single-spa:routing-event')); // dédoublonné
    const gotos = sent(win).filter((x: any) => x.kind === 'goto');
    expect(gotos).toEqual([{ kind: 'goto', path: '/b?q=1', seq: 1 }]);
    expect(win.postMessage.mock.calls.at(-1)[1]).toBe(ORIGIN);
  });

  it('application sans pont : le changement d\'URL du Core recharge l\'iframe au bon endroit', async () => {
    const { iframe } = await mount({ navigation: nav });
    coreAt('/egen/spa/next/c');
    window.dispatchEvent(new Event('single-spa:routing-event'));
    expect(iframe.src).toBe(`${ORIGIN}/app/c`);
  });

  it('poignée de main : hello à chaque chargement ; init annonce la navigation ; démontage nettoie', async () => {
    const { iframe, win, lc, props } = await mount({ navigation: nav });
    iframe.dispatchEvent(new Event('load'));
    expect(sent(win)).toContainEqual({ kind: 'hello' });
    post(env({ kind: 'ready', caps: ['location', 'goto'] }), win);
    expect(sent(win).find((x: any) => x.kind === 'init').payload.navigation).toEqual({ mode: 'history', route: 'next' });
    await lc.unmount(props);
    win.postMessage.mockClear();
    coreAt('/egen/spa/next/zz');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(win.postMessage).not.toHaveBeenCalled();
  });

  it('titre annoncé avec la position → onTitle (fil d\'Ariane)', async () => {
    const onTitle = vi.fn();
    const { win } = await mount({ navigation: { ...nav, onTitle } });
    post(env({ kind: 'location', path: '/t', title: 'Mes thèmes' }), win);
    expect(onTitle).toHaveBeenCalledWith('Mes thèmes');
  });
});

describe('script injectable egen-bridge.js', () => {
  const code = readFileSync(resolve(process.cwd(), 'assets/egen-bridge.js'), 'utf8');
  const HOST = 'https://core.exemple.org';
  let parent: { postMessage: ReturnType<typeof vi.fn> };
  const origPush = window.history.pushState;
  const origReplace = window.history.replaceState;

  function load(attrs: Record<string, string> = {}) {
    delete (window as any).EgenBridge;
    const el = document.createElement('script');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(`data-${k}`, v);
    Object.defineProperty(document, 'currentScript', { value: el, configurable: true });
    new Function(code).call(window);
  }
  const fromHost = (message: unknown, origin = HOST) =>
    window.dispatchEvent(new MessageEvent('message', { data: { egen: 1, moduleName: 'mod', message }, origin, source: parent as any }));
  const out = () => parent.postMessage.mock.calls.map((c: any[]) => c[0].message);

  beforeEach(() => {
    parent = { postMessage: vi.fn() };
    Object.defineProperty(window, 'parent', { value: parent, configurable: true });
    window.history.replaceState(null, '', '/dash');
  });
  afterEach(() => {
    window.history.pushState = origPush;
    window.history.replaceState = origReplace;
    delete (window as any).EgenBridge;
    Object.defineProperty(window, 'parent', { value: window, configurable: true });
  });

  it('silencieux tant que le Shell n\'a pas parlé ; hello → ready + position (replace)', () => {
    load();
    window.history.pushState(null, '', '/avant');
    expect(parent.postMessage).not.toHaveBeenCalled();
    fromHost({ kind: 'hello' });
    expect(out()).toEqual([
      { kind: 'ready', caps: ['location', 'goto'] },
      { kind: 'location', path: '/avant', replace: true, title: document.title },
    ]);
    expect(parent.postMessage.mock.calls[0][1]).toBe(HOST);
  });

  it('annonce pushState / replaceState / popstate, sans doublon', () => {
    load();
    fromHost({ kind: 'hello' });
    parent.postMessage.mockClear();
    window.history.pushState(null, '', '/a?x=1');
    window.history.pushState(null, '', '/a?x=1');
    window.history.replaceState(null, '', '/b');
    expect(out().map((x: any) => [x.path, x.replace])).toEqual([
      ['/a?x=1', false],
      ['/b', true],
    ]);
  });

  it('retire le préfixe data-base-path ; mode hash lit #/chemin', () => {
    load({ 'base-path': '/studio' });
    window.history.replaceState(null, '', '/studio/editor/x');
    fromHost({ kind: 'hello' });
    expect(out().at(-1).path).toBe('/editor/x');
    window.history.pushState = origPush;
    window.history.replaceState = origReplace;
    parent.postMessage.mockClear();
    load({ mode: 'hash' });
    window.history.replaceState(null, '', '/#/dashboard/recent?team-id=1');
    fromHost({ kind: 'hello' });
    expect(out().at(-1).path).toBe('/dashboard/recent?team-id=1');
  });

  it('goto : délègue à onGoto, ne renvoie pas l\'écho', () => {
    load();
    fromHost({ kind: 'hello' });
    parent.postMessage.mockClear();
    const handler = vi.fn(() => true);
    (window as any).EgenBridge.onGoto(handler);
    fromHost({ kind: 'goto', path: '/zz', seq: 1 });
    expect(handler).toHaveBeenCalledWith('/zz');
    window.history.replaceState(null, '', '/zz'); // l'app a suivi : aucune annonce en retour
    expect(out().filter((x: any) => x.kind === 'location')).toHaveLength(0);
  });

  it('data-hosts : messages d\'une autre origine ignorés ; une origine unique ensuite', () => {
    load({ hosts: HOST });
    fromHost({ kind: 'hello' }, 'https://evil.org');
    expect(parent.postMessage).not.toHaveBeenCalled();
    fromHost({ kind: 'hello' });
    expect(out().length).toBeGreaterThan(0);
  });

  it('ignore une source qui n\'est pas le parent, et mode none', () => {
    load();
    window.dispatchEvent(new MessageEvent('message', { data: { egen: 1, moduleName: 'm', message: { kind: 'hello' } }, origin: HOST, source: {} as any }));
    expect(parent.postMessage).not.toHaveBeenCalled();
    load({ mode: 'none' });
    expect((window as any).EgenBridge).toBeUndefined();
  });
});
