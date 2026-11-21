import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';

const h = vi.hoisted(() => ({
  config: {} as Record<string, any>,
  extConfig: undefined as any,
  session: undefined as any,
  flags: undefined as any,
  extStore: undefined as any,
  registerExtensionSlot: undefined as any,
  updateExtensionSlotState: undefined as any,
  renderExtension: undefined as any,
}));

vi.mock('@egen-civitas/esm-config', () => ({
  getConfigStore: (name: string) => h.config[name],
  getExtensionsConfigStore: () => h.extConfig,
  getExtensionConfigFromStore: (state: any, slot: string, id: string) => state.byId[`${slot}/${id}`] ?? { loaded: false, config: null },
}));
vi.mock('@egen-civitas/esm-api', () => ({ getSessionStore: () => h.session }));
vi.mock('@egen-civitas/esm-feature-flags', () => ({
  get featureFlagsStore() {
    return h.flags;
  },
}));
vi.mock('@egen-civitas/esm-extensions', () => ({
  getExtensionStore: () => h.extStore,
  registerExtensionSlot: (...a: any[]) => h.registerExtensionSlot(...a),
  updateExtensionSlotState: (...a: any[]) => h.updateExtensionSlotState(...a),
  renderExtension: (...a: any[]) => h.renderExtension(...a),
}));

import {
  assertLifecycleOptions,
  connectExtensionSlot,
  createComponentConfig,
  createTranslator,
  mountExtension,
  reportComponentError,
  resolveMountTarget,
  toAsyncLifecycleExport,
  toLifecycleExport,
  watchComponentConfig,
  watchFeatureFlag,
  watchSession,
  watchStore,
  watchTranslations,
  whenConfigLoaded,
  whenSessionLoaded,
} from './index.js';

const ext = { extensionId: 'e1', extensionSlotName: 'slot-a', extensionSlotModuleName: '@acme/host' };

beforeEach(() => {
  h.config = { '@acme/x': createStore(() => ({ loaded: false, config: null as any })) };
  h.extConfig = createStore(() => ({ byId: {} as Record<string, any> }));
  h.session = createStore(() => ({ loaded: false, session: null as any }));
  h.flags = createStore(() => ({ flags: {} as Record<string, any> }));
  h.extStore = createStore(() => ({ slots: {} as Record<string, any> }));
  h.registerExtensionSlot = vi.fn();
  h.updateExtensionSlotState = vi.fn();
});
afterEach(() => vi.useRealTimers());

describe('watchStore', () => {
  it('émet la valeur initiale puis uniquement les changements', () => {
    const s = createStore(() => ({ a: 1, b: 1 }));
    const seen: number[] = [];
    const stop = watchStore(s, (x) => x.a, (v) => seen.push(v));
    s.setState({ b: 2 });
    s.setState({ a: 2 });
    stop();
    s.setState({ a: 3 });
    expect(seen).toEqual([1, 2]);
  });
  it('immediate:false ne diffuse pas l’état initial', () => {
    const s = createStore(() => ({ a: 1 }));
    const seen: number[] = [];
    watchStore(s, (x) => x.a, (v) => seen.push(v), { immediate: false });
    expect(seen).toEqual([]);
  });
});

describe('watchComponentConfig', () => {
  it('attend le chargement de la configuration du module', () => {
    const got: any[] = [];
    watchComponentConfig({ moduleName: '@acme/x' }, (c) => got.push(c));
    expect(got).toEqual([]);
    h.config['@acme/x'].setState({ loaded: true, config: { color: 'red' } });
    expect(got).toEqual([{ color: 'red' }]);
  });
  it('fusionne la config de l’extension, qui prime, et attend les deux', () => {
    h.config['@acme/x'].setState({ loaded: true, config: { color: 'red', size: 1 } });
    const got: any[] = [];
    watchComponentConfig({ moduleName: '@acme/x', extension: ext }, (c) => got.push(c));
    expect(got).toEqual([]);
    h.extConfig.setState({ byId: { 'slot-a/e1': { loaded: true, config: { size: 2 } } } });
    expect(got).toEqual([{ color: 'red', size: 2 }]);
  });
  it('module externe : configuration du module seul', () => {
    h.config['@other/y'] = createStore(() => ({ loaded: true, config: { z: 1 } }));
    const got: any[] = [];
    watchComponentConfig({ moduleName: '@other/y', externalModuleName: '@other/y', extension: ext }, (c) => got.push(c));
    h.extConfig.setState({ byId: { 'slot-a/e1': { loaded: true, config: { z: 9 } } } });
    expect(got.at(-1)).toEqual({ z: 1 });
  });
  it('refuse l’absence de contexte', () => {
    expect(() => watchComponentConfig({ moduleName: '' }, () => {})).toThrow(/moduleName/);
  });
  it('se désabonne', () => {
    const got: any[] = [];
    const stop = watchComponentConfig({ moduleName: '@acme/x' }, (c) => got.push(c));
    stop();
    h.config['@acme/x'].setState({ loaded: true, config: { a: 1 } });
    expect(got).toEqual([]);
  });
  it('whenConfigLoaded se résout à la première configuration', async () => {
    const p = whenConfigLoaded({ moduleName: '@acme/x' });
    h.config['@acme/x'].setState({ loaded: true, config: { a: 1 } });
    await expect(p).resolves.toEqual({ a: 1 });
  });
  it('whenConfigLoaded : configuration déjà chargée', async () => {
    h.config['@acme/x'].setState({ loaded: true, config: { a: 1 } });
    await expect(whenConfigLoaded({ moduleName: '@acme/x' })).resolves.toEqual({ a: 1 });
  });
});

describe('session et drapeaux', () => {
  it('watchSession n’émet qu’une fois la session chargée', () => {
    const got: any[] = [];
    watchSession((s) => got.push(s));
    expect(got).toEqual([]);
    h.session.setState({ loaded: true, session: { user: 'u' } });
    expect(got).toEqual([{ user: 'u' }]);
  });
  it('whenSessionLoaded', async () => {
    const p = whenSessionLoaded();
    h.session.setState({ loaded: true, session: { user: 'u' } });
    await expect(p).resolves.toEqual({ user: 'u' });
  });
  it('watchFeatureFlag : faux par défaut puis vrai', () => {
    const got: boolean[] = [];
    watchFeatureFlag('beta', (v) => got.push(v));
    h.flags.setState({ flags: { beta: { enabled: true } } });
    expect(got).toEqual([false, true]);
  });
});

describe('i18n', () => {
  it('traduit dans l’espace de noms du module', () => {
    const t = vi.fn((k: string, o: any) => `${o.ns}:${k}:${o.defaultValue}`);
    (window as any).i18next = { t, on: vi.fn(), off: vi.fn() };
    expect(createTranslator('@acme/x')('hello', 'Bonjour')).toBe('@acme/x:hello:Bonjour');
  });
  it('sans i18next : valeur par défaut puis clé', () => {
    delete (window as any).i18next;
    const t = createTranslator('@acme/x');
    expect(t('k', 'Défaut')).toBe('Défaut');
    expect(t('k')).toBe('k');
  });
  it('watchTranslations abonne puis désabonne', () => {
    const on = vi.fn();
    const off = vi.fn();
    (window as any).i18next = { t: vi.fn(), on, off };
    const stop = watchTranslations(() => {});
    expect(on).toHaveBeenCalledWith('languageChanged', expect.any(Function));
    stop();
    expect(off).toHaveBeenCalledTimes(3);
  });
});

describe('contrat et DOM', () => {
  it('assertLifecycleOptions', () => {
    expect(() => assertLifecycleOptions({ moduleName: 'a' })).toThrow('Invalid options');
    expect(() => assertLifecycleOptions(null)).toThrow('Invalid options');
    expect(() => assertLifecycleOptions({ moduleName: 'a', featureName: 'b' })).not.toThrow();
  });
  it('createComponentConfig', () => {
    expect(createComponentConfig({ moduleName: 'a', featureName: 'b' }, ext)).toEqual({ moduleName: 'a', featureName: 'b', extension: ext });
  });
  it('resolveMountTarget : domElement prioritaire, sinon div Single-SPA, sinon erreur', () => {
    const el = document.createElement('div');
    expect(resolveMountTarget({ domElement: el, name: 'n' })).toBe(el);
    const page = document.createElement('div');
    page.id = 'single-spa-application:n-page-0';
    document.body.appendChild(page);
    expect(resolveMountTarget({ name: 'n-page-0' })).toBe(page);
    expect(() => resolveMountTarget({ name: 'absent' })).toThrow(/introuvable/);
  });
  it('reportComponentError relance l’erreur enrichie, de façon asynchrone', () => {
    vi.useFakeTimers();
    const err: any = new Error('boom');
    reportComponentError(err, {}, { componentStack: 'x' });
    expect(err.extra).toEqual({ componentStack: 'x' });
    expect(() => vi.runAllTimers()).toThrow('boom');
    reportComponentError(new Error('muet'), { throwErrorsToConsole: false });
    expect(() => vi.runAllTimers()).not.toThrow();
  });
  it('toLifecycleExport / toAsyncLifecycleExport renvoient des fonctions → lifecycles', async () => {
    const lc: any = { bootstrap: 1, mount: 2, unmount: 3 };
    await expect(toLifecycleExport(lc)()).resolves.toBe(lc);
    await expect(toAsyncLifecycleExport(() => Promise.resolve({ lc }), (m) => m.lc)()).resolves.toBe(lc);
  });
});

describe('connectExtensionSlot', () => {
  it('enregistre le slot, relaie les extensions assignées et met à jour l’état', () => {
    const got: any[] = [];
    const c = connectExtensionSlot({ moduleName: '@acme/host', slotName: 'slot-a', state: { a: 1 }, onExtensions: (e) => got.push(e) });
    expect(h.registerExtensionSlot).toHaveBeenCalledWith('@acme/host', 'slot-a', { a: 1 });
    expect(got).toEqual([[]]);
    h.extStore.setState({ slots: { 'slot-a': { assignedExtensions: [{ id: 'e1' }] } } });
    expect(got.at(-1)).toEqual([{ id: 'e1' }]);
    c.update({ a: 2 });
    expect(h.updateExtensionSlotState).toHaveBeenCalledWith('slot-a', { a: 2 });
    c.dispose();
    h.extStore.setState({ slots: { 'slot-a': { assignedExtensions: [{ id: 'e2' }] } } });
    expect(got.at(-1)).toEqual([{ id: 'e1' }]);
  });
  it('refuse un moduleName vide', () => {
    expect(() => connectExtensionSlot({ moduleName: '', slotName: 's', onExtensions: () => {} })).toThrow(/Contexte/);
  });
});

describe('mountExtension', () => {
  const fakeParcel = (status: string) => {
    let st = status;
    return {
      getStatus: () => st,
      mountPromise: Promise.resolve(),
      unmount: vi.fn(() => { st = 'UNMOUNTED'; }),
      update: vi.fn(() => Promise.resolve()),
      setStatus: (s: string) => { st = s; },
    };
  };
  it('monte via renderExtension avec les bons arguments', async () => {
    const parcel = fakeParcel('MOUNTED');
    h.renderExtension = vi.fn(() => Promise.resolve(parcel));
    const node = document.createElement('div');
    const m = mountExtension(node, ext, { s: 1 });
    expect(h.renderExtension).toHaveBeenCalledWith(node, 'slot-a', '@acme/host', 'e1', undefined, { s: 1 });
    await m.update({ s: 2 });
    expect(parcel.update).toHaveBeenCalledWith({ s: 2 });
  });
  it('démonte un parcel monté', async () => {
    const parcel = fakeParcel('MOUNTED');
    h.renderExtension = vi.fn(() => Promise.resolve(parcel));
    const m = mountExtension(document.createElement('div'), ext);
    await new Promise((r) => setTimeout(r));
    m.unmount();
    expect(parcel.unmount).toHaveBeenCalledOnce();
  });
  it('en cours de montage : démonte dès que MOUNTED', async () => {
    const parcel = fakeParcel('MOUNTING');
    h.renderExtension = vi.fn(() => Promise.resolve(parcel));
    const m = mountExtension(document.createElement('div'), ext);
    await new Promise((r) => setTimeout(r));
    m.unmount();
    parcel.setStatus('MOUNTED');
    await new Promise((r) => setTimeout(r));
    expect(parcel.unmount).toHaveBeenCalledOnce();
  });
  it('unmount avant la fin du rendu : sans effet ni erreur', () => {
    h.renderExtension = vi.fn(() => new Promise(() => {}));
    expect(() => mountExtension(document.createElement('div'), ext).unmount()).not.toThrow();
  });
});
