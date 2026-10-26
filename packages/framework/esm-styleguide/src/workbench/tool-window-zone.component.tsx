import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { TOOL_WINDOW_SLOTS, type ToolWindowAnchor } from '@egen-civitas/esm-extensions';
import { ComponentContext, ExtensionSlot, useStore } from '@egen-civitas/esm-react-utils';
import { X } from 'lucide-react';
import { Splitter } from './splitter.component.js';
import { toolWindowTitle, useToolWindows, type ToolWindow } from './use-tool-windows.js';
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

/** Durée de fermeture/ouverture : alignée sur --egen-motion-zone (animations/_tokens.scss). */
const MOTION_MS = 300;

/** Classes d'animation héritées (animations/_animations.scss) selon l'ancre de la zone. */
const ENTER_CLASS: Readonly<Record<ToolWindowAnchor, string>> = {
  left: 'egen-anim-slide-in-from-left',
  right: 'egen-anim-slide-in-from-right',
  bottom: 'egen-anim-slide-in-from-bottom',
};
const EXIT_CLASS: Readonly<Record<ToolWindowAnchor, string>> = {
  left: 'egen-anim-slide-out-to-left',
  right: 'egen-anim-slide-out-to-right',
  bottom: 'egen-anim-slide-out-to-bottom',
};

type Phase = 'open' | 'opening' | 'closing';

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
  const targetOpen = Boolean(current);

  // La zone reste montée le temps de l'animation de fermeture : on garde la dernière fenêtre active.
  const lastRef = useRef<ToolWindow | undefined>(undefined);
  const wasOpenRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('open');
  if (current) {
    lastRef.current = current;
  }
  const displayed = current ?? (phase === 'closing' ? lastRef.current : undefined);
  const open = Boolean(displayed);

  useLayoutEffect(() => {
    if (targetOpen === wasOpenRef.current) {
      return;
    }
    wasOpenRef.current = targetOpen;
    setPhase(targetOpen ? 'opening' : 'closing');
    const timer = window.setTimeout(() => {
      if (!targetOpen) {
        lastRef.current = undefined;
      }
      setPhase('open');
    }, MOTION_MS);
    return () => window.clearTimeout(timer);
  }, [targetOpen]);

  // Publie la taille de la zone pour la grille du body ; 0 quand elle est repliée (animée en CSS).
  useEffect(() => {
    document.documentElement.style.setProperty(ZONE_SIZE_VARIABLES[anchor], targetOpen ? `${size}px` : '0px');
  }, [anchor, targetOpen, size]);
  useEffect(
    () => () => {
      document.documentElement.style.removeProperty(ZONE_SIZE_VARIABLES[anchor]);
    },
    [anchor],
  );

  // Seule la fenêtre affichée est rendue (et donc chargée) dans la zone.
  const displayedId = displayed?.id;
  const selectActive = useCallback(
    <T extends { name: string }>(extensions: T[]) => extensions.filter((extension) => extension.name === displayedId),
    [displayedId],
  );

  const title = displayed ? toolWindowTitle(displayed) : '';
  const motionClass = phase === 'closing' ? EXIT_CLASS[anchor] : phase === 'opening' ? ENTER_CLASS[anchor] : '';

  return (
    <aside
      data-testid={`workbench-zone-${anchor}`}
      data-anchor={anchor}
      data-open={targetOpen}
      data-phase={phase}
      aria-label={title || undefined}
      hidden={!open}
      style={{ '--egen-zone-inner-size': `${size}px` } as CSSProperties}
      className={`${styles.zone} ${styles[`zone-${anchor}`]} ${motionClass}`}
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
          <div key={displayedId} className={`${styles.zoneBody} egen-anim-fade-in`}>
            <ComponentContext.Provider value={ZONE_CONTEXT}>
              <ExtensionSlot name={TOOL_WINDOW_SLOTS[anchor]} select={selectActive} className={styles.zoneSlot} />
            </ComponentContext.Provider>
          </div>
          {phase !== 'closing' && <Splitter anchor={anchor} label={`Redimensionner ${title}`} />}
        </>
      )}
    </aside>
  );
}
