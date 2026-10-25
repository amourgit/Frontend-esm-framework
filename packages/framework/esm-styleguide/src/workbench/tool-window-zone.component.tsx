import React, { useCallback, useEffect } from 'react';
import { TOOL_WINDOW_SLOTS, type ToolWindowAnchor } from '@egen-civitas/esm-extensions';
import { ComponentContext, ExtensionSlot, useStore } from '@egen-civitas/esm-react-utils';
import { X } from 'lucide-react';
import { Splitter } from './splitter.component.js';
import { toolWindowTitle, useToolWindows } from './use-tool-windows.js';
import { closeToolWindow, workbenchStore } from './workbench.store.js';
import styles from './workbench.module.scss';

/**
 * Contexte de composant des zones. Le shell monte chaque zone dans un `createRoot` autonome, hors de tout
 * `egenComponentDecorator` : sans ce contexte, `ExtensionSlot` lève « ComponentContext has not been provided »
 * dès qu'une fenêtre d'outils s'ouvre. Les extensions rendues gardent, elles, le contexte de leur propre app.
 */
const ZONE_CONTEXT = { moduleName: '@egen-civitas/esm-styleguide', featureName: 'workbench' } as const;

/** Variable CSS lue par la grille du body (`_general.scss`) pour dimensionner chaque zone. */
const ZONE_SIZE_VARIABLES: Readonly<Record<ToolWindowAnchor, string>> = {
  left: '--egen-zone-left-width',
  right: '--egen-zone-right-width',
  bottom: '--egen-zone-bottom-height',
};

interface ToolWindowZoneProps {
  anchor: ToolWindowAnchor;
}

/**
 * Zone redimensionnable (gauche, droite ou bas) : affiche le contenu de la fenêtre d'outils
 * active du rail correspondant, sous un en-tête (titre + fermeture). Repliée (taille 0) tant
 * qu'aucune fenêtre d'outils valide n'est active : une fenêtre dont l'app n'est plus montée
 * replie donc la zone toute seule.
 */
export function ToolWindowZone({ anchor }: ToolWindowZoneProps) {
  const tools = useToolWindows(anchor);
  // NB : `useStore` retourne toujours un objet (état étalé) : on lit l'état entier, jamais une valeur primitive.
  const { active, sizes } = useStore(workbenchStore);
  const activeId = active[anchor];
  const size = sizes[anchor];
  const current = tools.find((tool) => tool.id === activeId);
  const open = Boolean(current);

  // Publie la taille de la zone pour la grille du body ; 0 quand elle est repliée.
  useEffect(() => {
    document.documentElement.style.setProperty(ZONE_SIZE_VARIABLES[anchor], open ? `${size}px` : '0px');
  }, [anchor, open, size]);
  useEffect(
    () => () => {
      document.documentElement.style.removeProperty(ZONE_SIZE_VARIABLES[anchor]);
    },
    [anchor],
  );

  // Seule la fenêtre active est rendue (et donc chargée) dans la zone.
  const selectActive = useCallback(
    <T extends { name: string }>(extensions: T[]) => extensions.filter((extension) => extension.name === activeId),
    [activeId],
  );

  const title = current ? toolWindowTitle(current) : '';

  return (
    <aside
      data-testid={`workbench-zone-${anchor}`}
      data-anchor={anchor}
      data-open={open}
      aria-label={title || undefined}
      hidden={!open}
      className={`${styles.zone} ${styles[`zone-${anchor}`]}`}
    >
      {open && (
        <>
          <header className={styles.zoneHeader}>
            <h2 className={styles.zoneTitle}>{title}</h2>
            <button
              type="button"
              className={styles.zoneClose}
              aria-label={`Fermer ${title}`}
              title={`Fermer ${title}`}
              onClick={() => closeToolWindow(anchor)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </header>
          <div className={styles.zoneBody}>
            <ComponentContext.Provider value={ZONE_CONTEXT}>
              <ExtensionSlot name={TOOL_WINDOW_SLOTS[anchor]} select={selectActive} className={styles.zoneSlot} />
            </ComponentContext.Provider>
          </div>
          <Splitter anchor={anchor} label={`Redimensionner ${title}`} />
        </>
      )}
    </aside>
  );
}
