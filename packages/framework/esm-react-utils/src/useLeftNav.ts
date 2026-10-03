/** @module @category UI */
import { useContext, useEffect } from 'react';
import { type SetLeftNavParams, setLeftNav, unsetLeftNav } from '@egen-civitas/esm-extensions';
import { ComponentContext } from './ComponentContext.js';

/**
 * A React hook that registers a left navigation menu for the current component.
 * The navigation is automatically registered when the component mounts and
 * unregistered when it unmounts.
 *
 * **Important:** This hook should only be used in "page" components, not in
 * "extension" components. Extensions should not control the left navigation.
 *
 * @param params Configuration parameters for the left navigation, excluding the
 *   module name which is automatically determined from the component context.
 *
 * @example
 * ```tsx
 * import { useLeftNav } from '@egen-civitas/esm-framework';
 * function MyPageComponent() {
 *   useLeftNav({ name: 'my-nav', slots: ['nav-slot-1', 'nav-slot-2'] });
 *   return <div>My Page</div>;
 * }
 * ```
 *
 * @deprecated Il n'existe plus de barre latérale globale : la navigation de niveau 2 est portée par la TopBar (slot `topbar-level2-nav`, type `NavEntryMeta`). Une app qui a besoin d'une navigation interne affiche sa propre barre latérale.
 */
export function useLeftNav(params: Omit<SetLeftNavParams, 'module'>) {
  const componentContext = useContext(ComponentContext);

  useEffect(() => {
    if (componentContext && componentContext.moduleName) {
      (params as SetLeftNavParams).componentContext = componentContext;
    }

    setLeftNav(params);

    return () => {
      unsetLeftNav(params.name);
    };
  }, [componentContext, params]);
}
