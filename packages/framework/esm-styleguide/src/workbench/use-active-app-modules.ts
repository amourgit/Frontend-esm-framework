import { useEffect, useState } from 'react';
import { getMountedApps } from 'single-spa';

/**
 * Les pages d'une app sont enregistrées dans single-spa sous `<module>-page-<index>`
 * (voir `esm-routes`). On retrouve donc le nom du module en retirant ce suffixe.
 */
const PAGE_SUFFIX = /-page-\d+$/;

/** Noms des modules (apps) dont au moins une page est actuellement montée. */
export function getActiveModuleNames(): ReadonlySet<string> {
  return new Set(getMountedApps().map((name) => name.replace(PAGE_SUFFIX, '')));
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>) {
  return a.size === b.size && [...a].every((name) => b.has(name));
}

/**
 * Modules (apps) actifs, réévalués à chaque changement de route (`single-spa:routing-event`).
 * La référence retournée reste stable tant que l'ensemble ne change pas.
 */
export function useActiveAppModules(): ReadonlySet<string> {
  const [modules, setModules] = useState<ReadonlySet<string>>(getActiveModuleNames);

  useEffect(() => {
    const update = () =>
      setModules((previous) => {
        const next = getActiveModuleNames();
        return sameSet(previous, next) ? previous : next;
      });
    window.addEventListener('single-spa:routing-event', update);
    update();
    return () => window.removeEventListener('single-spa:routing-event', update);
  }, []);

  return modules;
}
