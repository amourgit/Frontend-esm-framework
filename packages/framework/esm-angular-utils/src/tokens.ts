import { InjectionToken, type Signal } from '@angular/core';
import type { ComponentConfig } from '@egen-civitas/esm-extensions';

/** Équivalent de `ComponentContext` (esm-react-utils) : `{ moduleName, featureName, extension? }`. */
export const EGEN_COMPONENT_CONTEXT = new InjectionToken<ComponentConfig>('EGEN_COMPONENT_CONTEXT');

/** Props Single-SPA courantes (état d'une extension…), mises à jour par `update`. */
export const EGEN_PROPS = new InjectionToken<Signal<Record<string, any>>>('EGEN_PROPS');
