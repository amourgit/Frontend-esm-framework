import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createApp, defineComponent, h, nextTick } from 'vue';

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
  Extension,
  ExtensionSlot,
  getAsyncLifecycle,
  getLifecycle,
  getSyncLifecycle,
  useComponentContext,
  useConfig,
  useFeatureFlag,
  useSession,
  useStore,
  useTranslation,
} from './index.js';

const opts = { moduleName: '@acme/vue-app', featureName: 'demo', throwErrorsToConsole: false };
const flush = async () => {
  await nextTick();
  await new Promise((r) => setTimeout(r));
  await nextTick();
};

function pageContainer(name: string) {
  const el = document.createElement('div');
  el.id = `single-spa-application:${name}`;
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  m.config = { '@acme/vue-app': createStore(() => ({ loaded: false, config: null as any })) };
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
    const exp = getSyncLifecycle(defineComponent({ render: () => h('p', 'x') }), opts);
    expect(typeof exp).toBe('function');
    const lc = await exp();
    for (const k of ['bootstrap', 'mount', 'unmount', 'update']) expect(typeof (lc as any)[k]).toBe('function');
  });
  it('getAsyncLifecycle charge le module à la demande', async () => {
    const load = vi.fn(() => Promise.resolve({ default: defineComponent({ render: () => h('p', 'async') }) }));
    const exp = getAsyncLifecycle(load, opts);
    expect(load).not.toHaveBeenCalled();
    const lc: any = await exp();
    expect(load).toHaveBeenCalledOnce();
    pageContainer('a-page-0');
    await lc.bootstrap({ name: 'a-page-0' });
    await lc.mount({ name: 'a-page-0' });
    expect(document.body.textContent).toContain('async');
  });
  it('options invalides : « Invalid options »', () => {
    expect(() => getLifecycle(defineComponent({ render: () => null }), { moduleName: 'x' } as any)).toThrow('Invalid options');
  });
});

describe('montage comme page (Single-SPA)', () => {
  it('monte dans #single-spa-application:<nom>, transmet les props utiles, démonte proprement', async () => {
    const seen: any[] = [];
    const Comp = defineComponent({
      props: { who: String },
      setup(p, { attrs }) {
        seen.push({ ...p, attrs: { ...attrs } });
        return () => h('span', `salut ${p.who}`);
      },
    });
    const lc: any = getLifecycle(Comp, opts);
    const el = pageContainer('p-page-0');
    const props = { name: 'p-page-0', who: 'EGEN', singleSpa: {}, mountParcel: () => {} };
    await lc.bootstrap(props);
    await lc.mount(props);
    expect(el.textContent).toContain('salut EGEN');
    expect(seen[0].attrs).toEqual({}); // props Single-SPA internes non transmises
    await lc.unmount(props);
    expect(el.textContent).toBe('');
  });
});

describe('montage comme parcel (extension / modale)', () => {
  it('utilise domElement et expose _extensionContext via useComponentContext', async () => {
    let ctx: any;
    const Comp = defineComponent({ setup: () => { ctx = useComponentContext(); return () => h('b', 'ext'); } });
    const lc: any = getLifecycle(Comp, opts);
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const extCtx = { extensionId: 'e1', extensionSlotName: 's', extensionSlotModuleName: '@acme/host' };
    const props = { name: 's/e1-0', domElement: dom, _extensionContext: extCtx };
    await lc.mount(props);
    expect(dom.textContent).toContain('ext');
    expect(ctx).toEqual({ moduleName: '@acme/vue-app', featureName: 'demo', extension: extCtx });
    await lc.unmount(props);
  });
  it('update : les nouvelles props redessinent le composant', async () => {
    const Comp = defineComponent({ props: { n: Number }, setup: (p) => () => h('i', `n=${p.n}`) });
    const lc: any = getLifecycle(Comp, opts);
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    await lc.mount({ name: 'u-0', domElement: dom, n: 1 });
    expect(dom.textContent).toContain('n=1');
    await lc.update({ name: 'u-0', domElement: dom, n: 2 });
    await flush();
    expect(dom.textContent).toContain('n=2');
    await lc.unmount({ name: 'u-0', domElement: dom });
  });
  it('plugins et configure sont appliqués avant le montage', async () => {
    const plugin = { install: vi.fn() };
    const configure = vi.fn();
    const lc: any = getLifecycle(defineComponent({ render: () => h('p') }), { ...opts, plugins: [plugin], configure });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    await lc.mount({ name: 'c-0', domElement: dom });
    expect(plugin.install).toHaveBeenCalledOnce();
    expect(configure).toHaveBeenCalledOnce();
    await lc.unmount({ name: 'c-0', domElement: dom });
  });
});

describe('gestion d’erreur', () => {
  it('une erreur de rendu affiche le repli et ne casse pas la page', async () => {
    const Bad = defineComponent({ setup: () => () => { throw new Error('rendu cassé'); } });
    const lc: any = getLifecycle(Bad, opts);
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    await lc.mount({ name: 'e-0', domElement: dom });
    await flush();
    expect(dom.textContent).toContain('An error has occurred');
    await lc.unmount({ name: 'e-0', domElement: dom });
  });
  it('throwErrorsToConsole : l’erreur est relancée de façon asynchrone', async () => {
    vi.useFakeTimers();
    const Bad = defineComponent({ setup: () => () => { throw new Error('visible'); } });
    const lc: any = getLifecycle(Bad, { ...opts, throwErrorsToConsole: true });
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    await lc.mount({ name: 'e-1', domElement: dom });
    expect(() => vi.runAllTimers()).toThrow('visible');
  });
});

describe('composables', () => {
  async function mountProbe(setup: () => () => any) {
    const lc: any = getLifecycle(defineComponent({ setup }), opts);
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    await lc.mount({ name: 'k-0', domElement: dom });
    return dom;
  }
  it('useConfig : null puis configuration chargée', async () => {
    const dom = await mountProbe(() => { const c = useConfig<{ color: string }>(); return () => h('p', c.value ? c.value.color : 'vide'); });
    expect(dom.textContent).toBe('vide');
    m.config['@acme/vue-app'].setState({ loaded: true, config: { color: 'rouge' } });
    await flush();
    expect(dom.textContent).toBe('rouge');
  });
  it('useSession', async () => {
    const dom = await mountProbe(() => { const s = useSession(); return () => h('p', (s.value as any)?.user ?? 'anon'); });
    expect(dom.textContent).toBe('anon');
    m.session.setState({ loaded: true, session: { user: 'ada' } });
    await flush();
    expect(dom.textContent).toBe('ada');
  });
  it('useFeatureFlag', async () => {
    const dom = await mountProbe(() => { const f = useFeatureFlag('beta'); return () => h('p', String(f.value)); });
    expect(dom.textContent).toBe('false');
    m.flags.setState({ flags: { beta: { enabled: true } } });
    await flush();
    expect(dom.textContent).toBe('true');
  });
  it('useStore avec sélecteur', async () => {
    const store = createStore(() => ({ a: 1, b: 1 }));
    const dom = await mountProbe(() => { const a = useStore(store, (s) => s.a); return () => h('p', `a=${a.value}`); });
    store.setState({ a: 5 });
    await flush();
    expect(dom.textContent).toBe('a=5');
  });
  it('useTranslation : espace de noms du module, réactive au changement de langue', async () => {
    const handlers: Record<string, () => void> = {};
    let lang = 'fr';
    (window as any).i18next = {
      t: (k: string, o: any) => `${o.ns}|${lang}|${k}`,
      on: (e: string, cb: () => void) => { handlers[e] = cb; },
      off: vi.fn(),
    };
    const dom = await mountProbe(() => { const { t } = useTranslation(); return () => h('p', t('hello', 'Bonjour')); });
    expect(dom.textContent).toBe('@acme/vue-app|fr|hello');
    lang = 'en';
    handlers.languageChanged();
    await flush();
    expect(dom.textContent).toBe('@acme/vue-app|en|hello');
  });
  it('useComponentContext hors lifecycle EGEN : erreur explicite', () => {
    const app = createApp(defineComponent({ setup: () => { useComponentContext(); return () => null; } }));
    const errors: unknown[] = [];
    app.config.errorHandler = (e) => errors.push(e);
    app.mount(document.createElement('div'));
    expect(String((errors[0] as Error)?.message)).toMatch(/contexte de composant EGEN/i);
  });
});

describe('ExtensionSlot et Extension', () => {
  const hostOpts = { moduleName: '@acme/host', featureName: 'host', throwErrorsToConsole: false };
  async function mountHost(render: () => any) {
    const lc: any = getLifecycle(defineComponent({ render }), hostOpts);
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    await lc.mount({ name: 'h-0', domElement: dom });
    return { dom, lc };
  }
  it('enregistre le slot, rend une extension par entrée assignée et les monte', async () => {
    const parcel = { getStatus: () => 'MOUNTED', mountPromise: Promise.resolve(), unmount: vi.fn(), update: vi.fn(() => Promise.resolve()) };
    m.renderExtension = vi.fn(() => Promise.resolve(parcel));
    const { dom } = await mountHost(() => h(ExtensionSlot, { name: 'top' }));
    expect(m.registerExtensionSlot).toHaveBeenCalledWith('@acme/host', 'top', undefined);
    expect(dom.querySelector('[data-extension-slot-name="top"]')).toBeTruthy();

    m.extStore.setState({ slots: { top: { assignedExtensions: [{ id: 'x1' }, { id: 'x2' }] } } });
    await flush();
    const nodes = dom.querySelectorAll('[data-extension-id]');
    expect([...nodes].map((n) => n.getAttribute('data-extension-id'))).toEqual(['x1', 'x2']);
    expect(m.renderExtension).toHaveBeenCalledTimes(2);
    expect(m.renderExtension.mock.calls[0].slice(1, 5)).toEqual(['top', '@acme/host', 'x1', undefined]);

    m.extStore.setState({ slots: { top: { assignedExtensions: [{ id: 'x2' }] } } });
    await flush();
    expect(parcel.unmount).toHaveBeenCalledTimes(1);
  });
  it('slot à portée : rendu personnalisé, <Extension /> hérite du contexte', async () => {
    m.renderExtension = vi.fn(() => Promise.resolve(null));
    const { dom } = await mountHost(() =>
      h(ExtensionSlot, { name: 'menu' }, {
        default: ({ extension }: any) => h('li', { class: 'item' }, [h('em', extension.id), h(Extension)]),
      }),
    );
    m.extStore.setState({ slots: { menu: { assignedExtensions: [{ id: 'm1' }] } } });
    await flush();
    expect(dom.querySelector('li.item em')?.textContent).toBe('m1');
    expect(m.renderExtension.mock.calls[0].slice(1, 4)).toEqual(['menu', '@acme/host', 'm1']);
  });
  it('select filtre les extensions', async () => {
    const { dom } = await mountHost(() => h(ExtensionSlot, { name: 'f', select: (e: any[]) => e.filter((x) => x.id !== 'no') }));
    m.extStore.setState({ slots: { f: { assignedExtensions: [{ id: 'yes' }, { id: 'no' }] } } });
    await flush();
    expect([...dom.querySelectorAll('[data-extension-id]')].map((n) => n.getAttribute('data-extension-id'))).toEqual(['yes']);
  });
  it('refuse slot par défaut + state ensemble', async () => {
    const lc: any = getLifecycle(
      defineComponent({ render: () => h(ExtensionSlot, { name: 's', state: { a: 1 } }, { default: () => null }) }),
      hostOpts,
    );
    const dom = document.createElement('div');
    document.body.appendChild(dom);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await lc.mount({ name: 'h-1', domElement: dom });
    await flush();
    expect(dom.textContent).toContain('An error has occurred');
    warn.mockRestore();
  });
});
