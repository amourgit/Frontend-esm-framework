import {
  computed,
  getCurrentScope,
  inject,
  onScopeDispose,
  readonly,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
  type ShallowRef,
} from 'vue';
import type { Session } from '@egen-civitas/esm-api';
import type { ConfigObject } from '@egen-civitas/esm-config';
import type { AssignedExtension, ComponentConfig, ExtensionSlotCustomState } from '@egen-civitas/esm-extensions';
import {
  connectExtensionSlot,
  createTranslator,
  watchComponentConfig,
  watchFeatureFlag,
  watchSession,
  watchStore,
  watchTranslations,
  type StoreLike,
  type Unsubscribe,
  type WatchConfigOptions,
} from '@egen-civitas/esm-integration-utils';
import { COMPONENT_CONTEXT } from './keys.js';

/** Arrête l'observation quand le composant (ou la portée d'effet) est détruit. */
function stopWithScope(stop: Unsubscribe) {
  if (getCurrentScope()) onScopeDispose(stop);
}

/** Contexte du composant courant (`moduleName`, `featureName`, `extension`). */
export function useComponentContext(): ComponentConfig {
  const ctx = inject(COMPONENT_CONTEXT, null);
  if (!ctx) {
    throw new Error(
      'Aucun contexte de composant EGEN. Il est fourni par les fabriques getSyncLifecycle / getAsyncLifecycle de @egen-civitas/esm-vue-utils.',
    );
  }
  return ctx;
}

/**
 * Configuration du module (fusionnée avec celle de l'extension, comme `useConfig` de esm-react-utils).
 * `null` tant que la configuration n'est pas chargée.
 */
export function useConfig<T = Record<string, any>>(options?: { externalModuleName?: string }): Readonly<ShallowRef<T | null>> {
  const { moduleName, extension } = useComponentContext();
  const config = shallowRef<T | null>(null);
  const opts: WatchConfigOptions = { moduleName, extension, externalModuleName: options?.externalModuleName };
  stopWithScope(watchComponentConfig(opts, (c: ConfigObject) => (config.value = c as T)));
  return config;
}

/** Session de l'utilisateur ; `null` tant qu'elle n'est pas chargée. */
export function useSession(): Readonly<ShallowRef<Session | null>> {
  const session = shallowRef<Session | null>(null);
  stopWithScope(watchSession((s) => (session.value = s)));
  return session;
}

/** Valeur dérivée d'un magasin (type zustand) ; se met à jour à chaque changement. */
export function useStore<T, U = T>(store: StoreLike<T>, select?: (state: T) => U): Readonly<ShallowRef<U>> {
  const pick = (select ?? ((s: T) => s as unknown as U)) as (state: T) => U;
  const value = shallowRef<U>(pick(store.getState())) as ShallowRef<U>;
  stopWithScope(watchStore(store, pick, (v) => (value.value = v)));
  return value;
}

/** État d'un drapeau de fonctionnalité (faux si inconnu). */
export function useFeatureFlag(flagName: string): Readonly<Ref<boolean>> {
  const enabled = ref(false);
  stopWithScope(watchFeatureFlag(flagName, (v) => (enabled.value = v)));
  return readonly(enabled);
}

/**
 * Traduction dans l'espace de noms du module. `t` est réactive : changement de langue ou
 * chargement tardif des traductions redessinent les gabarits qui l'utilisent.
 */
export function useTranslation() {
  const { moduleName } = useComponentContext();
  const translate = createTranslator(moduleName);
  const version = ref(0);
  stopWithScope(watchTranslations(() => version.value++));
  const t = (key: string, defaultValue?: string, options?: Record<string, unknown>) => {
    version.value; // dépendance réactive
    return translate(key, defaultValue, options);
  };
  return { t };
}

/** Enregistre un slot d'extensions et renvoie ses extensions assignées (équivalent de `useExtensionSlot`). */
export function useExtensionSlot(slotName: string | Ref<string>, state?: Ref<ExtensionSlotCustomState | undefined>) {
  const { moduleName } = useComponentContext();
  const name = typeof slotName === 'string' ? slotName : slotName.value;
  const extensions = shallowRef<Array<AssignedExtension>>([]);
  const connection = connectExtensionSlot({
    moduleName,
    slotName: name,
    state: state?.value,
    onExtensions: (e) => (extensions.value = e),
  });
  stopWithScope(connection.dispose);
  if (state) watch(state, (s) => connection.update(s), { deep: false });
  const assigned: ComputedRef<Array<AssignedExtension>> = computed(() => extensions.value);
  return { extensions: assigned, extensionSlotName: name, extensionSlotModuleName: moduleName };
}
