import type { InjectionKey } from 'vue';
import type { ComponentConfig } from '@egen-civitas/esm-extensions';

/** Équivalent de `ComponentContext` (esm-react-utils). Fourni par `egenPlugin`. */
export const COMPONENT_CONTEXT: InjectionKey<ComponentConfig> = Symbol('egen:component-context');
