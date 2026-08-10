import { createContext } from 'react';
import { type ComponentConfig } from '@egen-civitas/esm-extensions';

/**
 * Available to all components. Provided by `egenComponentDecorator`.
 */
export const ComponentContext = createContext<ComponentConfig>({
  moduleName: '',
  featureName: '',
});
