import { ErrorHandler, makeEnvironmentProviders, type EnvironmentProviders, type Signal } from '@angular/core';
import {
  assertLifecycleOptions,
  createComponentConfig,
  extensionFromProps,
  reportComponentError,
  type LifecycleOptions,
} from '@egen-civitas/esm-integration-utils';
import { EGEN_COMPONENT_CONTEXT, EGEN_PROPS } from './tokens.js';

/**
 * Fournisseurs EGEN d'une application Angular : contexte du composant, props Single-SPA
 * (en signal) et gestion d'erreurs (équivalent de la frontière d'erreur de esm-react-utils).
 * Ajoutés automatiquement par `getLifecycle` ; exposés pour les cas particuliers.
 */
export function provideEgen(
  opts: LifecycleOptions,
  props: Record<string, any>,
  propsSignal: Signal<Record<string, any>>,
): EnvironmentProviders {
  assertLifecycleOptions(opts);
  return makeEnvironmentProviders([
    { provide: EGEN_COMPONENT_CONTEXT, useValue: createComponentConfig(opts, extensionFromProps(props)) },
    { provide: EGEN_PROPS, useValue: propsSignal },
    {
      provide: ErrorHandler,
      useValue: {
        handleError: (err: unknown) =>
          reportComponentError(err, { throwErrorsToConsole: opts.throwErrorsToConsole }, { moduleName: opts.moduleName }),
      } satisfies ErrorHandler,
    },
  ]);
}
