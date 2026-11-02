import React, { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { TOOL_WINDOW_SLOTS, type ToolWindowAnchor } from '@egen-civitas/esm-extensions';
import { ComponentContext, ExtensionSlot, useStore } from '@egen-civitas/esm-react-utils';
import { X } from 'lucide-react';
import { CompartmentSplitter, CornerSplitter, Splitter } from './splitter.component.js';
import { TOOL_WINDOW_CONTAINER_ATTRIBUTE, TOOL_WINDOW_HEADER_ATTRIBUTE } from './tool-window-header.component.js';
import { toolWindowTitle, useToolWindows, type ToolWindow } from './use-tool-windows.js';
import {
  DEFAULT_COMPARTMENT_ID,
  DEFAULT_COMPARTMENT_LIMITS,
  fitCompartmentHeights,
  type CompartmentItem,
} from './compartments.js';
import {
  closeToolWindow,
  compartmentKey,
  getOpenCompartments,
  setCompartmentHeights,
  workbenchStore,
  type SideAnchor,
} from './workbench.store.js';
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

/** Un compartiment affiché : la fenêtre d'outils, et ses bornes de hauteur (en % de la zone). */
interface ZoneCompartment {
  tool: ToolWindow;
  item: CompartmentItem;
}

/**
 * Zone redimensionnable (gauche, droite ou bas) : empile les compartiments qui affichent les fenêtres d'outils
 * des rails, chacun sous son en-tête (titre + fermeture).
 *
 * - Le **compartiment par défaut** affiche la fenêtre d'outils active du rail (une seule à la fois).
 * - Les fenêtres dont `meta.compartment` est un objet ont chacune **leur compartiment propre**, ouvert à côté
 *   du compartiment par défaut (zones gauche et droite uniquement).
 *
 * Les hauteurs des compartiments totalisent toujours 100 % de la zone (aucun débordement) ; chacun défile en
 * interne et se redimensionne face à ses voisins. La zone elle-même est transparente : le fond sombre est
 * porté par les compartiments. Repliée (taille 0) tant qu'aucune fenêtre d'outils valide n'est ouverte : une
 * fenêtre dont l'app n'est plus montée replie donc la zone toute seule.
 */
export function ToolWindowZone({ anchor }: ToolWindowZoneProps) {
  const tools = useToolWindows(anchor);
  // NB : `useStore` retourne toujours un objet (état étalé) : on lit l'état entier, jamais une valeur primitive.
  const state = useStore(workbenchStore);
  const { active, sizes } = state;
  const activeId = active[anchor];
  const size = sizes[anchor];
  const side = anchor === 'bottom' ? null : (anchor as SideAnchor);

  // Compartiments à afficher : le défaut (fenêtre active du rail) puis les propres, dans l'ordre d'ouverture.
  const compartments: ZoneCompartment[] = [];
  const currentDefault = tools.find((tool) => !tool.compartment && tool.id === activeId);
  if (currentDefault) {
    compartments.push({
      tool: currentDefault,
      item: { key: compartmentKey(side ?? 'left'), ...DEFAULT_COMPARTMENT_LIMITS },
    });
  }
  if (side) {
    for (const id of getOpenCompartments(side, state)) {
      const tool = tools.find((candidate) => candidate.id === id && candidate.compartment);
      if (tool?.compartment) compartments.push({ tool, item: { key: compartmentKey(side, id), ...tool.compartment } });
    }
  }
  const targetOpen = compartments.length > 0;

  // La zone reste montée le temps de l'animation de fermeture : on garde les derniers compartiments affichés.
  const lastRef = useRef<ZoneCompartment[]>([]);
  const wasOpenRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('open');
  if (targetOpen) {
    lastRef.current = compartments;
  }
  const displayed = targetOpen ? compartments : phase === 'closing' ? lastRef.current : [];
  const open = displayed.length > 0;

  useLayoutEffect(() => {
    if (targetOpen === wasOpenRef.current) {
      return;
    }
    wasOpenRef.current = targetOpen;
    setPhase(targetOpen ? 'opening' : 'closing');
    const timer = window.setTimeout(() => {
      if (!targetOpen) {
        lastRef.current = [];
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

  // Hauteurs (%) des compartiments : somme de 100, bornes respectées ; mémorisées dès qu'il y en a plusieurs.
  const items = displayed.map(({ item }) => item);
  const heights = fitCompartmentHeights(items, state.heights ?? {});
  const heightsSignature = items.map((item, i) => `${item.key}=${heights[i]}`).join('|');
  useEffect(() => {
    if (!targetOpen || items.length < 2) return;
    setCompartmentHeights(Object.fromEntries(items.map((item, i) => [item.key, heights[i]])));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la signature résume `items` et `heights`
  }, [targetOpen, heightsSignature]);

  const title = displayed[0] ? toolWindowTitle(displayed[0].tool) : '';
  const motionClass = phase === 'closing' ? EXIT_CLASS[anchor] : phase === 'opening' ? ENTER_CLASS[anchor] : '';
  const settled = phase !== 'closing';

  return (
    <aside
      data-testid={`workbench-zone-${anchor}`}
      data-anchor={anchor}
      data-open={targetOpen}
      data-phase={phase}
      data-compartments={displayed.length}
      aria-label={title || undefined}
      hidden={!open}
      style={{ '--egen-zone-inner-size': `${size}px` } as CSSProperties}
      className={`${styles.zone} ${styles[`zone-${anchor}`]} ${motionClass}`}
    >
      {open && (
        <>
          {displayed.map(({ tool, item }, index) => (
            <Fragment key={item.key}>
              {index > 0 && settled && side && (
                <CompartmentSplitter
                  anchor={side}
                  index={index - 1}
                  items={items}
                  heights={heights}
                  label={`Redimensionner ${toolWindowTitle(displayed[index - 1].tool)} et ${toolWindowTitle(tool)}`}
                />
              )}
              {index > 0 && !(settled && side) && <span aria-hidden="true" className={styles.compartmentGap} />}
              <Compartment
                anchor={anchor}
                tool={tool}
                height={heights[index]}
                own={item.key !== compartmentKey(side ?? 'left')}
                single={displayed.length === 1}
              />
            </Fragment>
          ))}
          {phase !== 'closing' && <Splitter anchor={anchor} label={`Redimensionner ${title}`} />}
          {/* Angles : à l'intersection de la zone basse et de chaque zone latérale ouverte (deux axes à la fois). */}
          {anchor === 'bottom' && phase !== 'closing' && active.left !== null && (
            <CornerSplitter side="left" label="Redimensionner la zone gauche et la zone basse" />
          )}
          {anchor === 'bottom' && phase !== 'closing' && active.right !== null && (
            <CornerSplitter side="right" label="Redimensionner la zone droite et la zone basse" />
          )}
        </>
      )}
    </aside>
  );
}

interface CompartmentProps {
  anchor: ToolWindowAnchor;
  tool: ToolWindow;
  /** Part de la hauteur de la zone, en % (proportion : les compartiments se partagent la hauteur). */
  height: number;
  /** Vrai pour un compartiment propre (fermé sans replier les autres), faux pour le compartiment par défaut. */
  own: boolean;
  single: boolean;
}

/** Un compartiment : carte sombre arrondie, en-tête (titre, actions, fermeture) et corps qui défile. */
function Compartment({ anchor, tool, height, own, single }: CompartmentProps) {
  const title = toolWindowTitle(tool);
  const selectTool = useCallback(
    <T extends { name: string }>(extensions: T[]) => extensions.filter((extension) => extension.name === tool.id),
    [tool.id],
  );

  return (
    <section
      data-testid={`workbench-compartment-${anchor}-${own ? tool.id : DEFAULT_COMPARTMENT_ID}`}
      data-compartment={own ? 'own' : 'default'}
      data-height={Math.round(height * 100) / 100}
      {...{ [TOOL_WINDOW_CONTAINER_ATTRIBUTE]: '' }}
      // Hauteur proportionnelle (flex-grow = pourcentage, base nulle) : la somme remplit exactement la zone,
      // écarts entre compartiments compris, sans calcul en pixels.
      style={single ? undefined : { flex: `${height} 1 0%` }}
      className={styles.compartment}
    >
      <header className={styles.zoneHeader}>
        <h2 className={styles.zoneTitle}>{title}</h2>
        {/* Emplacement des actions de la fenêtre d'outils (voir ToolWindowHeader). */}
        <div className={styles.zoneHeaderTools} {...{ [TOOL_WINDOW_HEADER_ATTRIBUTE]: '' }} />
        <button
          type="button"
          className={styles.zoneClose}
          aria-label={`Fermer ${title}`}
          title={`Fermer ${title}`}
          onClick={() => closeToolWindow(anchor, tool.id)}
        >
          <X size={14} aria-hidden="true" />
        </button>
      </header>
      <div key={tool.id} className={`${styles.zoneBody} egen-anim-fade-in`}>
        <ComponentContext.Provider value={ZONE_CONTEXT}>
          <ExtensionSlot name={TOOL_WINDOW_SLOTS[anchor]} select={selectTool} className={styles.zoneSlot} />
        </ComponentContext.Provider>
      </div>
    </section>
  );
}
