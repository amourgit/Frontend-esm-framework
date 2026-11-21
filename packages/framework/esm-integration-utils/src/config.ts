import {
  type ConfigObject,
  getConfigStore,
  getExtensionConfigFromStore,
  getExtensionsConfigStore,
} from '@egen-civitas/esm-config';
import type { ExtensionData } from '@egen-civitas/esm-extensions';
import type { Unsubscribe } from './types.js';

export interface WatchConfigOptions {
  moduleName: string;
  /** Présent quand le composant est monté comme extension (config propre à l'extension). */
  extension?: ExtensionData;
  /** Lire la configuration d'un AUTRE module (à éviter : couplage entre modules). */
  externalModuleName?: string;
}

/**
 * Observe la configuration d'un composant. Même sémantique que `useConfig` de esm-react-utils :
 *   - n'émet qu'une fois la configuration du module chargée (et celle de l'extension, si présente) ;
 *   - fusion `{ ...module, ...extension }`, sauf lecture d'un module externe (module seul).
 */
export function watchComponentConfig(opts: WatchConfigOptions, onChange: (config: ConfigObject) => void): Unsubscribe {
  const moduleName = opts.externalModuleName ?? opts.moduleName;
  if (!moduleName && !opts.extension) {
    throw new Error('Aucun contexte de composant : moduleName requis (fourni par les fabriques de lifecycle EGEN).');
  }
  const { extension } = opts;
  const external = !!opts.externalModuleName && moduleName === opts.externalModuleName;
  let normal: ConfigObject | null = null;
  let ext: ConfigObject | null = extension ? null : {};

  const emit = () => {
    if (normal && ext) onChange(external ? { ...normal } : { ...normal, ...ext });
  };

  const moduleStore = getConfigStore(moduleName);
  const readModule = (s: { loaded: boolean; config: ConfigObject | null }) => {
    if (s.loaded && s.config) {
      normal = s.config;
      emit();
    }
  };
  readModule(moduleStore.getState() as any);
  const unsubs: Unsubscribe[] = [moduleStore.subscribe(readModule as any)];

  if (extension) {
    const extStore = getExtensionsConfigStore();
    const readExt = (state: any) => {
      const c = getExtensionConfigFromStore(state, extension.extensionSlotName, extension.extensionId);
      if (c.loaded && c.config) {
        ext = c.config;
        emit();
      }
    };
    readExt(extStore.getState());
    unsubs.push(extStore.subscribe(readExt));
  }
  return () => unsubs.forEach((u) => u());
}

/** Promesse résolue à la première configuration complète. */
export function whenConfigLoaded(opts: WatchConfigOptions): Promise<ConfigObject> {
  return new Promise((resolve) => {
    let stop: Unsubscribe | undefined;
    let done = false;
    stop = watchComponentConfig(opts, (config) => {
      done = true;
      resolve(config);
      stop?.();
    });
    if (done) stop();
  });
}
