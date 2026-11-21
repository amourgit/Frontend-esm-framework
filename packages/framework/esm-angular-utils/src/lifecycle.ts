import { NgZone, reflectComponentType, signal, type EnvironmentProviders, type Provider, type Type, type WritableSignal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import type { LifeCycles } from 'single-spa';
import { singleSpaAngular } from 'single-spa-angular';
import {
  assertLifecycleOptions,
  toAsyncLifecycleExport,
  toLifecycleExport,
  type LifecycleExport,
  type LifecycleOptions,
} from '@egen-civitas/esm-integration-utils';
import { provideEgen } from './providers.js';

export interface AngularLifecycleOptions extends LifecycleOptions {
  /** Fournisseurs de l'application (routeur, HttpClient, provideSingleSpaPlatform()…). */
  providers?: Array<Provider | EnvironmentProviders>;
  /**
   * Détection de changements : `false` (défaut) = **sans zone.js** (signals), recommandé car zone.js
   * modifie des API globales partagées par toutes les apps de la page ; `true` = avec zone.js
   * (à charger par l'application ; ajouter `provideZoneChangeDetection()` dans `providers`).
   */
  zone?: boolean;
  /** Options supplémentaires transmises à `single-spa-angular` (Router, NavigationStart…). */
  singleSpa?: Record<string, unknown>;
}

const SIMPLE_SELECTOR = /^[a-z][a-z0-9-]*$/i;

/** Props Single-SPA internes : non relayées dans le signal de props. */
const RESERVED_PROPS = new Set(['name', 'singleSpa', 'mountParcel', 'domElement', '_extensionContext', 'unmountSelf']);
const publicProps = (props: Record<string, any>) =>
  Object.fromEntries(Object.entries(props).filter(([k]) => !RESERVED_PROPS.has(k)));

/**
 * Lifecycles Single-SPA d'un composant racine Angular **autonome** (standalone), avec le contexte EGEN
 * (équivalent de `getLifecycle` de esm-react-utils). Repose sur `single-spa-angular`.
 * Le composant doit déclarer un `selector` simple (ex. `app-root`).
 */
export function getLifecycle(Component: Type<unknown>, userOpts: AngularLifecycleOptions): LifeCycles {
  assertLifecycleOptions(userOpts);
  const opts: AngularLifecycleOptions = { throwErrorsToConsole: true, disableTranslations: false, zone: false, ...userOpts };

  const selector = reflectComponentType(Component)?.selector;
  if (!selector || !SIMPLE_SELECTOR.test(selector)) {
    throw new Error(
      `Le composant racine doit déclarer un « selector » d'élément simple (reçu : ${JSON.stringify(selector)}), par ex. 'app-root'.`,
    );
  }

  const instances = new Map<string, WritableSignal<Record<string, any>>>();
  const key = (props: any) => props.name || props.appName;

  const lifecycles = singleSpaAngular({
    NgZone: opts.zone ? NgZone : 'noop',
    template: `<${selector}></${selector}>`,
    bootstrapFunction: (props: any) => {
      const propsSignal = signal(publicProps(props));
      instances.set(key(props), propsSignal);
      return bootstrapApplication(Component, {
        providers: [provideEgen(opts, props, propsSignal), ...(opts.providers ?? [])],
      });
    },
    // Les nouvelles props (état d'une extension…) mettent à jour le signal EGEN_PROPS.
    updateFunction: (props: any) => {
      instances.get(key(props))?.set(publicProps(props));
      return Promise.resolve();
    },
    ...(opts.singleSpa ?? {}),
  } as any);

  return {
    bootstrap: lifecycles.bootstrap,
    mount: lifecycles.mount,
    update: lifecycles.update,
    unmount: (props: any) => (lifecycles.unmount as any)(props).finally(() => instances.delete(key(props))),
  } as LifeCycles;
}

/** Export prêt pour `routes.json` : fonction → promesse de lifecycles (comportement de `getSyncLifecycle`). */
export function getSyncLifecycle(Component: Type<unknown>, options: AngularLifecycleOptions): LifecycleExport {
  return toLifecycleExport(getLifecycle(Component, options));
}

/** Variante paresseuse : `() => import('./app.component')` (export `default`). */
export function getAsyncLifecycle(
  load: () => Promise<{ default: Type<unknown> }>,
  options: AngularLifecycleOptions,
): LifecycleExport {
  return toAsyncLifecycleExport(load, (m) => getLifecycle(m.default, options));
}

/** Alias historique (même nom que dans esm-react-utils). */
export const getAsyncExtensionLifecycle = getAsyncLifecycle;
