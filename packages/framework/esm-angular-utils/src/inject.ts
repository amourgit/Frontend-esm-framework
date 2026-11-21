/**
 * Fonctions `inject*` : à appeler dans un contexte d'injection (constructeur, initialiseur de champ,
 * `runInInjectionContext`). Chaque observation s'arrête automatiquement à la destruction du composant.
 * Elles renvoient des *signals* : lisibles dans les gabarits et compatibles avec la détection de
 * changements sans zone.
 */
import { DestroyRef, effect, inject, signal, type Signal } from '@angular/core';
import type { Session } from '@egen-civitas/esm-api';
import type { ConfigObject } from '@egen-civitas/esm-config';
import type { AssignedExtension, ComponentConfig, ExtensionData, ExtensionSlotCustomState } from '@egen-civitas/esm-extensions';
import {
  connectExtensionSlot,
  createTranslator,
  mountExtension,
  watchComponentConfig,
  watchFeatureFlag,
  watchSession,
  watchStore,
  watchTranslations,
  type ExtensionMount,
  type StoreLike,
  type Unsubscribe,
} from '@egen-civitas/esm-integration-utils';
import { EGEN_COMPONENT_CONTEXT, EGEN_PROPS } from './tokens.js';

const untilDestroyed = (stop: Unsubscribe) => inject(DestroyRef).onDestroy(stop);

/** Contexte du composant (`moduleName`, `featureName`, `extension?`). */
export function injectComponentContext(): ComponentConfig {
  const ctx = inject(EGEN_COMPONENT_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      'Aucun contexte de composant EGEN. Il est fourni par getSyncLifecycle / getAsyncLifecycle de @egen-civitas/esm-angular-utils.',
    );
  }
  return ctx;
}

/** Props Single-SPA courantes (état transmis à une extension…), mises à jour par `update`. */
export function injectEgenProps<T extends Record<string, any> = Record<string, any>>(): Signal<T> {
  return inject(EGEN_PROPS) as Signal<T>;
}

/** Configuration du module (fusionnée avec celle de l'extension) ; `null` tant que non chargée. */
export function injectConfig<T = Record<string, any>>(options?: { externalModuleName?: string }): Signal<T | null> {
  const { moduleName, extension } = injectComponentContext();
  const config = signal<T | null>(null);
  untilDestroyed(
    watchComponentConfig({ moduleName, extension, externalModuleName: options?.externalModuleName }, (c: ConfigObject) =>
      config.set(c as T),
    ),
  );
  return config.asReadonly();
}

/** Session de l'utilisateur ; `null` tant qu'elle n'est pas chargée. */
export function injectSession(): Signal<Session | null> {
  const session = signal<Session | null>(null);
  untilDestroyed(watchSession((s) => session.set(s)));
  return session.asReadonly();
}

/** Valeur dérivée d'un magasin (type zustand). */
export function injectStore<T, U = T>(store: StoreLike<T>, select?: (state: T) => U): Signal<U> {
  const pick = (select ?? ((s: T) => s as unknown as U)) as (state: T) => U;
  const value = signal<U>(pick(store.getState()));
  untilDestroyed(watchStore(store, pick, (v) => value.set(v)));
  return value.asReadonly();
}

/** État d'un drapeau de fonctionnalité (faux si inconnu). */
export function injectFeatureFlag(flagName: string): Signal<boolean> {
  const enabled = signal(false);
  untilDestroyed(watchFeatureFlag(flagName, (v) => enabled.set(v)));
  return enabled.asReadonly();
}

/**
 * Traduction dans l'espace de noms du module. `t` lit un signal interne : utilisée dans un gabarit ou un
 * `computed`/`effect`, elle se réévalue au changement de langue ou au chargement tardif des traductions.
 */
export function injectTranslate() {
  const { moduleName } = injectComponentContext();
  const translate = createTranslator(moduleName);
  const version = signal(0);
  untilDestroyed(watchTranslations(() => version.update((v) => v + 1)));
  return (key: string, defaultValue?: string, options?: Record<string, unknown>): string => {
    version();
    return translate(key, defaultValue, options);
  };
}

/** Enregistre un slot d'extensions et renvoie ses extensions assignées (équivalent de `useExtensionSlot`). */
export function injectExtensionSlot(slotName: string, state?: Signal<ExtensionSlotCustomState | undefined>) {
  const { moduleName } = injectComponentContext();
  const extensions = signal<Array<AssignedExtension>>([]);
  const connection = connectExtensionSlot({
    moduleName,
    slotName,
    state: state?.(),
    onExtensions: (e) => extensions.set(e),
  });
  untilDestroyed(connection.dispose);
  if (state) effect(() => connection.update(state()));
  return { extensions: extensions.asReadonly(), extensionSlotName: slotName, extensionSlotModuleName: moduleName };
}

/**
 * Renvoie une fonction qui monte une extension dans un élément (parcel) ; l'extension est démontée
 * automatiquement à la destruction du composant. À appeler depuis `ngAfterViewInit` / un `effect`.
 */
export function injectExtensionMounter() {
  const mounted: ExtensionMount[] = [];
  inject(DestroyRef).onDestroy(() => mounted.forEach((m) => m.unmount()));
  return (node: HTMLElement, extension: ExtensionData, state?: Record<string, unknown>): ExtensionMount => {
    const m = mountExtension(node, extension, state);
    mounted.push(m);
    return m;
  };
}
