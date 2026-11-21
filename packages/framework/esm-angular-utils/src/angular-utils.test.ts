import '@angular/compiler';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { Component, ErrorHandler, inject, type Type } from '@angular/core';

const m = vi.hoisted(() => ({
  config: {} as Record<string, any>,
  extConfig: undefined as any,
  session: undefined as any,
  flags: undefined as any,
  extStore: undefined as any,
  renderExtension: undefined as any,
  registerExtensionSlot: undefined as any,
  updateExtensionSlotState: undefined as any,
}));

vi.mock('@egen-civitas/esm-config', () => ({
  getConfigStore: (n: string) => m.config[n],
  getExtensionsConfigStore: () => m.extConfig,
  getExtensionConfigFromStore: (s: any, slot: string, id: string) => s.byId[`${slot}/${id}`] ?? { loaded: false, config: null },
}));
vi.mock('@egen-civitas/esm-api', () => ({ getSessionStore: () => m.session }));
vi.mock('@egen-civitas/esm-feature-flags', () => ({
  get featureFlagsStore() {
    return m.flags;
  },
}));
vi.mock('@egen-civitas/esm-extensions', () => ({
  getExtensionStore: () => m.extStore,
  registerExtensionSlot: (...a: any[]) => m.registerExtensionSlot(...a),
  updateExtensionSlotState: (...a: any[]) => m.updateExtensionSlotState(...a),
  renderExtension: (...a: any[]) => m.renderExtension(...a),
}));

import {
  getAsyncLifecycle,
  getLifecycle,
  getSyncLifecycle,
  injectComponentContext,
  injectConfig,
  injectEgenProps,
  injectExtensionMounter,
  injectExtensionSlot,
  injectFeatureFlag,
  injectSession,
  injectStore,
  injectTranslate,
} from './index.js';

const opts = { moduleName: '@acme/ng-app', featureName: 'demo', throwErrorsToConsole: false };
const flush = async () => {
  for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r));
};

/** Composant autonome sans décorateur (JIT) : `Component(meta)(classe)`. */
let n = 0;
function comp(template: string, init?: (self: any) => void, selector = `app-t${++n}`): Type<unknown> {
  class C {
    constructor() {
      init?.(this);
    }
  }
  return Component({ selector, template })(C) as Type<unknown>;
}

function host(name: string) {
  const el = document.createElement('div');
  el.id = `single-spa-application:${name}`;
  document.body.appendChild(el);
  return el;
}
async function mountAsParcel(c: Type<unknown>, name: string, extra: Record<string, any> = {}, o: any = opts) {
  const lc: any = getLifecycle(c, o);
  const dom = document.createElement('div');
  document.body.appendChild(dom);
  const props = { name, domElement: dom, ...extra };
  await lc.bootstrap(props);
  await lc.mount(props);
  await flush();
  return { lc, dom, props };
}

beforeEach(() => {
  m.config = { '@acme/ng-app': createStore(() => ({ loaded: false, config: null as any })) };
  m.extConfig = createStore(() => ({ byId: {} as Record<string, any> }));
  m.session = createStore(() => ({ loaded: false, session: null as any }));
  m.flags = createStore(() => ({ flags: {} as Record<string, any> }));
  m.extStore = createStore(() => ({ slots: {} as Record<string, any> }));
  m.registerExtensionSlot = vi.fn();
  m.updateExtensionSlotState = vi.fn();
  m.renderExtension = vi.fn(() => Promise.resolve(null));
  delete (window as any).i18next;
});
afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('contrat des exports', () => {
  it('getSyncLifecycle : fonction → promesse de lifecycles', async () => {
    const lc: any = await getSyncLifecycle(comp('<p>x</p>'), opts)();
    for (const k of ['bootstrap', 'mount', 'unmount', 'update']) expect(typeof lc[k]).toBe('function');
  });
  it('getAsyncLifecycle charge le module à la demande', async () => {
    const load = vi.fn(() => Promise.resolve({ default: comp('<p>async</p>') }));
    const exp = getAsyncLifecycle(load, opts);
    expect(load).not.toHaveBeenCalled();
    const lc: any = await exp();
    expect(load).toHaveBeenCalledOnce();
    const el = host('a-page-0');
    await lc.bootstrap({ name: 'a-page-0' });
    await lc.mount({ name: 'a-page-0' });
    await flush();
    expect(el.textContent).toContain('async');
  });
  it('options invalides : « Invalid options »', () => {
    expect(() => getLifecycle(comp('<p></p>'), { moduleName: 'x' } as any)).toThrow('Invalid options');
  });
  it('refuse un selector qui n’est pas un nom d’élément simple', () => {
    class Bad {}
    const bad = Component({ selector: 'div.racine', template: '<p></p>' })(Bad) as Type<unknown>;
    expect(() => getLifecycle(bad, opts)).toThrow(/selector/);
  });
});

describe('montage', () => {
  it('page : monte dans #single-spa-application:<nom>, démonte proprement', async () => {
    const lc: any = getLifecycle(comp('<span>salut Angular</span>'), opts);
    const el = host('p-page-0');
    const props = { name: 'p-page-0' };
    await lc.bootstrap(props);
    await lc.mount(props);
    await flush();
    expect(el.textContent).toContain('salut Angular');
    await lc.unmount(props);
    expect(el.textContent).toBe('');
  });
  it('parcel : domElement + _extensionContext via injectComponentContext', async () => {
    let ctx: any;
    const extCtx = { extensionId: 'e1', extensionSlotName: 's', extensionSlotModuleName: '@acme/host' };
    const { lc, dom, props } = await mountAsParcel(comp('<b>ext</b>', () => { ctx = injectComponentContext(); }), 's/e1-0', { _extensionContext: extCtx });
    expect(dom.textContent).toContain('ext');
    expect(ctx).toEqual({ moduleName: '@acme/ng-app', featureName: 'demo', extension: extCtx });
    await lc.unmount(props);
  });
  it('update : les nouvelles props mettent à jour le signal et redessinent', async () => {
    const { lc, dom, props } = await mountAsParcel(
      comp('<i>n={{ p().n }}</i>', (self) => { self.p = injectEgenProps<{ n: number }>(); }),
      'u-0',
      { n: 1 },
    );
    expect(dom.textContent).toContain('n=1');
    await lc.update({ ...props, n: 2 });
    await flush();
    expect(dom.textContent).toContain('n=2');
    await lc.unmount(props);
  });
  it('props Single-SPA internes non exposées', async () => {
    let seen: any;
    const { lc, props } = await mountAsParcel(comp('<p></p>', () => { seen = injectEgenProps()(); }), 'r-0', { x: 1, singleSpa: {}, mountParcel: () => {} });
    expect(seen).toEqual({ x: 1 });
    await lc.unmount(props);
  });
  it('providers de l’application transmis', async () => {
    const TOKEN = (await import('@angular/core')).InjectionToken;
    const t = new TOKEN<string>('t');
    let v: any;
    const { lc, props } = await mountAsParcel(comp('<p></p>', () => { v = inject(t); }), 'pr-0', {}, { ...opts, providers: [{ provide: t, useValue: 'ok' }] });
    expect(v).toBe('ok');
    await lc.unmount(props);
  });
});

describe('gestion d’erreur', () => {
  it('ErrorHandler EGEN : erreur enrichie et relancée de façon asynchrone', async () => {
    let handler: ErrorHandler | undefined;
    const { lc, props } = await mountAsParcel(comp('<p></p>', () => { handler = inject(ErrorHandler); }), 'e-0', {}, { ...opts, throwErrorsToConsole: true });
    vi.useFakeTimers();
    handler!.handleError(new Error('visible'));
    expect(() => vi.runAllTimers()).toThrow('visible');
    vi.useRealTimers();
    await lc.unmount(props);
  });
});

describe('fonctions inject*', () => {
  it('injectConfig : null puis configuration chargée', async () => {
    const { dom } = await mountAsParcel(comp('<p>{{ c()?.color ?? "vide" }}</p>', (s) => { s.c = injectConfig<{ color: string }>(); }), 'k-0');
    expect(dom.textContent).toBe('vide');
    m.config['@acme/ng-app'].setState({ loaded: true, config: { color: 'rouge' } });
    await flush();
    expect(dom.textContent).toBe('rouge');
  });
  it('injectSession', async () => {
    const { dom } = await mountAsParcel(comp('<p>{{ s()?.user ?? "anon" }}</p>', (x) => { x.s = injectSession(); }), 'k-1');
    expect(dom.textContent).toBe('anon');
    m.session.setState({ loaded: true, session: { user: 'ada' } });
    await flush();
    expect(dom.textContent).toBe('ada');
  });
  it('injectFeatureFlag', async () => {
    const { dom } = await mountAsParcel(comp('<p>{{ f() }}</p>', (x) => { x.f = injectFeatureFlag('beta'); }), 'k-2');
    expect(dom.textContent).toBe('false');
    m.flags.setState({ flags: { beta: { enabled: true } } });
    await flush();
    expect(dom.textContent).toBe('true');
  });
  it('injectStore avec sélecteur', async () => {
    const store = createStore(() => ({ a: 1, b: 1 }));
    const { dom } = await mountAsParcel(comp('<p>a={{ a() }}</p>', (x) => { x.a = injectStore(store, (s) => s.a); }), 'k-3');
    store.setState({ a: 5 });
    await flush();
    expect(dom.textContent).toBe('a=5');
  });
  it('injectTranslate : espace de noms du module, réactive au changement de langue', async () => {
    const handlers: Record<string, () => void> = {};
    let lang = 'fr';
    (window as any).i18next = { t: (k: string, o: any) => `${o.ns}|${lang}|${k}`, on: (e: string, cb: () => void) => { handlers[e] = cb; }, off: vi.fn() };
    const { dom } = await mountAsParcel(comp('<p>{{ t("hello", "Bonjour") }}</p>', (x) => { x.t = injectTranslate(); }), 'k-4');
    expect(dom.textContent).toBe('@acme/ng-app|fr|hello');
    lang = 'en';
    handlers.languageChanged();
    await flush();
    expect(dom.textContent).toBe('@acme/ng-app|en|hello');
  });
  it('injectComponentContext hors lifecycle EGEN : erreur explicite', async () => {
    const { createEnvironmentInjector, EnvironmentInjector, runInInjectionContext } = await import('@angular/core');
    const inj = createEnvironmentInjector([], undefined as unknown as typeof EnvironmentInjector.prototype);
    expect(() => runInInjectionContext(inj, () => injectComponentContext())).toThrow(/contexte de composant EGEN/i);
  });
});

describe('extensions', () => {
  it('injectExtensionSlot enregistre le slot et relaie les extensions ; le montage est nettoyé à la destruction', async () => {
    const parcel = { getStatus: () => 'MOUNTED', mountPromise: Promise.resolve(), unmount: vi.fn(), update: vi.fn(() => Promise.resolve()) };
    m.renderExtension = vi.fn(() => Promise.resolve(parcel));
    let slot: any;
    let mounter: any;
    const hostOpts = { moduleName: '@acme/host', featureName: 'host', throwErrorsToConsole: false };
    const { lc, dom, props } = await mountAsParcel(
      comp('<ul><li *ngFor="let e of []"></li></ul><p>{{ slot.extensions().length }}</p><div class="target"></div>', (x) => {
        x.slot = slot = injectExtensionSlot('top');
        mounter = injectExtensionMounter();
      }),
      'h-0',
      {},
      hostOpts,
    );
    expect(m.registerExtensionSlot).toHaveBeenCalledWith('@acme/host', 'top', undefined);
    m.extStore.setState({ slots: { top: { assignedExtensions: [{ id: 'x1' }, { id: 'x2' }] } } });
    await flush();
    expect(slot.extensions()).toEqual([{ id: 'x1' }, { id: 'x2' }]);
    expect(dom.querySelector('p')?.textContent).toBe('2');

    const target = dom.querySelector('.target') as HTMLElement;
    mounter(target, { extensionId: 'x1', extensionSlotName: 'top', extensionSlotModuleName: '@acme/host' }, { s: 1 });
    expect(m.renderExtension.mock.calls[0].slice(1, 6)).toEqual(['top', '@acme/host', 'x1', undefined, { s: 1 }]);
    await flush();
    await lc.unmount(props);
    await flush();
    expect(parcel.unmount).toHaveBeenCalledTimes(1);
  });
});
