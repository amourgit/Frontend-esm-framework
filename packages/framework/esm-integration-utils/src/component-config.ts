import type { ComponentConfig, ExtensionData } from '@egen-civitas/esm-extensions';
import type { LifecycleOptions } from './types.js';

/** Même contrôle (et même message) que `egenComponentDecorator` de esm-react-utils. */
export function assertLifecycleOptions(opts: unknown): asserts opts is LifecycleOptions {
  if (
    typeof opts !== 'object' ||
    opts === null ||
    typeof (opts as LifecycleOptions).featureName !== 'string' ||
    typeof (opts as LifecycleOptions).moduleName !== 'string'
  ) {
    throw new Error('Invalid options');
  }
}

/** Contexte d'un composant EGEN : identique à `ComponentContext` de esm-react-utils. */
export function createComponentConfig(
  opts: Pick<LifecycleOptions, 'moduleName' | 'featureName'>,
  extension?: ExtensionData,
): ComponentConfig {
  return { moduleName: opts.moduleName, featureName: opts.featureName, extension };
}

/** Le Shell fournit `_extensionContext` quand le composant est monté comme extension. */
export function extensionFromProps(props: unknown): ExtensionData | undefined {
  return (props as { _extensionContext?: ExtensionData } | undefined)?._extensionContext;
}
