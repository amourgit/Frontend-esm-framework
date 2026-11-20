import { createApp, h, shallowRef, type Component, type ShallowRef } from 'vue';
import singleSpaVue from 'single-spa-vue';
import type { LifeCycles } from 'single-spa';
import {
  assertLifecycleOptions,
  createComponentConfig,
  extensionFromProps,
  toAsyncLifecycleExport,
  toLifecycleExport,
  reportComponentError,
  type LifecycleExport,
  type LifecycleOptions,
} from '@egen-civitas/esm-integration-utils';
import { EgenErrorBoundary } from './components.js';
import { COMPONENT_CONTEXT } from './keys.js';

export interface VueLifecycleOptions extends LifecycleOptions {
  /** Plugins Vue à installer sur l'application (routeur, Pinia, i18n propre…). */
  plugins?: Array<any>;
  /** Dernier réglage de l'application avant montage (provide/inject, directives…). */
  configure?: (app: any, props: Record<string, any>) => void | Promise<void>;
}

/** Props Single-SPA internes : non transmises au composant racine. */
const RESERVED_PROPS = new Set(['name', 'singleSpa', 'mountParcel', 'domElement', '_extensionContext', 'unmountSelf']);
const componentProps = (props: Record<string, any>) =>
  Object.fromEntries(Object.entries(props).filter(([k]) => !RESERVED_PROPS.has(k)));

/**
 * Construit les lifecycles Single-SPA d'un composant Vue 3, avec le contexte EGEN
 * (équivalent de `getLifecycle` de esm-react-utils). Repose sur `single-spa-vue`.
 */
export function getLifecycle(Comp: Component, userOpts: VueLifecycleOptions): LifeCycles {
  assertLifecycleOptions(userOpts);
  const opts: VueLifecycleOptions = { throwErrorsToConsole: true, disableTranslations: false, ...userOpts };
  const instances = new Map<string, ShallowRef<Record<string, any>>>();

  const lifecycles = singleSpaVue({
    createApp,
    appOptions: (props: any) =>
      Promise.resolve({
        // `render` fourni ici : le rendu par défaut de single-spa-vue est écrit pour Vue 2.
        render: () =>
          h(EgenErrorBoundary, { throwErrorsToConsole: opts.throwErrorsToConsole }, {
            default: () => h(Comp, componentProps(instances.get(props.name)!.value)),
          }),
      }),
    handleInstance: async (app: any, props: any) => {
      app.provide(COMPONENT_CONTEXT, createComponentConfig(opts, extensionFromProps(props)));
      app.config.errorHandler = (err: unknown, _vm: unknown, info: string) =>
        reportComponentError(err, { throwErrorsToConsole: opts.throwErrorsToConsole }, { info, moduleName: opts.moduleName });
      opts.plugins?.forEach((p) => app.use(p));
      await opts.configure?.(app, props);
    },
  } as any);

  return {
    bootstrap: lifecycles.bootstrap,
    mount: (props: any) => {
      instances.set(props.name, shallowRef({ ...props }));
      return lifecycles.mount(props);
    },
    // Les nouvelles props (état d'une extension…) redessinent le composant racine.
    update: (props: any) => {
      const r = instances.get(props.name);
      if (r) r.value = { ...props };
      return Promise.resolve();
    },
    unmount: (props: any) => lifecycles.unmount(props).finally(() => instances.delete(props.name)),
  } as LifeCycles;
}

/** Export prêt pour `routes.json` : fonction → promesse de lifecycles (comportement de `getSyncLifecycle`). */
export function getSyncLifecycle(Comp: Component, options: VueLifecycleOptions): LifecycleExport {
  return toLifecycleExport(getLifecycle(Comp, options));
}

/** Variante paresseuse : `() => import('./Page.vue')` (le module doit avoir un export `default`). */
export function getAsyncLifecycle(
  load: () => Promise<{ default: Component }>,
  options: VueLifecycleOptions,
): LifecycleExport {
  return toAsyncLifecycleExport(load, (m) => getLifecycle(m.default, options));
}

/** Alias historique (même nom que dans esm-react-utils). */
export const getAsyncExtensionLifecycle = getAsyncLifecycle;
