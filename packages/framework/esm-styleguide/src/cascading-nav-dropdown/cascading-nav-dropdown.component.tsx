/** @category CascadingNavDropdown */
import React, { useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import classNames from 'classnames';
import { ChevronDownIcon } from '../icons/icons';
import { ColumnWithSearch } from './column-with-search.component';
import type { CascadingNavDropdownProps, NavigationItem } from './cascading-nav-dropdown.types';
import styles from './cascading-nav-dropdown.module.scss';

interface Anchor {
  left: number;
  top?: number;
  bottom?: number;
}

/**
 * `CascadingNavDropdown` — dropdown de navigation en cascade (colonnes qui
 * s'empilent horizontalement au fur et à mesure qu'on survole un item ayant
 * des enfants), déclenché par un bouton unique.
 *
 * Contenu 100% fourni par le consommateur (`items`) — aucune arborescence
 * n'est pré-remplie. Le sens d'ouverture est configurable via `direction` :
 * - `'down'` (par défaut) : le panneau glisse vers le bas, ancré sous le bouton.
 * - `'up'` : le panneau glisse vers le haut, ancré au-dessus du bouton — utile
 *   quand le déclencheur est en bas d'écran (ex. barre d'outils basse,
 *   pied de page) et qu'un dropdown vers le bas sortirait de la fenêtre.
 *
 * Position ancrée dynamiquement sur le bouton déclencheur (mesure de son
 * `getBoundingClientRect()` à l'ouverture) plutôt que sur une position fixe
 * en dur — le composant reste donc utilisable n'importe où dans l'UI.
 *
 * @example
 * ```tsx
 * <CascadingNavDropdown
 *   items={navigationTree}
 *   triggerLabel="Navigation"
 *   direction="up"
 *   searchable
 *   onNavigate={(path) => navigate({ to: path })}
 * />
 * ```
 */
export const CascadingNavDropdown: React.FC<CascadingNavDropdownProps> = ({
  items,
  triggerLabel = 'Navigation',
  triggerIcon: TriggerIcon,
  direction = 'down',
  searchable = false,
  searchPlaceholder = 'Rechercher…',
  onNavigate,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeColumns, setActiveColumns] = useState<NavigationItem[][]>([items]);
  const [activeItems, setActiveItems] = useState<(string | null)[]>([]);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);

  // ── Recalcule l'arborescence affichée si `items` change pendant que c'est fermé ──
  useLayoutEffect(() => {
    if (!isOpen) {
      setActiveColumns([items]);
      setActiveItems([]);
    }
  }, [items, isOpen]);

  // ── Ancrage dynamique sur le bouton déclencheur ─────────────────────────────
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 8;

    setAnchor(
      direction === 'up'
        ? { left: rect.left, bottom: window.innerHeight - rect.top + gap }
        : { left: rect.left, top: rect.bottom + gap },
    );
  }, [isOpen, direction]);

  const handleItemHover = (item: NavigationItem, level: number) => {
    const newActive = [...activeItems];
    newActive[level] = item.id;

    if (item.children?.length) {
      setActiveColumns([...activeColumns.slice(0, level + 1), item.children]);
    } else {
      setActiveColumns(activeColumns.slice(0, level + 1));
    }
    setActiveItems(newActive);
  };

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    onNavigate?.(path);
  };

  return (
    <div className={classNames(styles.wrapper, className)}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {TriggerIcon && <TriggerIcon className={styles.triggerIcon} size={16} />}
        <span>{triggerLabel}</span>
        <ChevronDownIcon
          className={classNames(styles.triggerChevron, {
            [styles['triggerChevron--open']]: isOpen,
            [styles['triggerChevron--up']]: direction === 'up',
          })}
          size={14}
        />
      </button>

      <AnimatePresence>
        {isOpen && anchor && (
          <>
            <div className={styles.overlay} onClick={() => setIsOpen(false)} aria-hidden="true" />

            <motion.div
              className={classNames(styles.panel, styles[`panel--${direction}`])}
              style={{
                left: anchor.left,
                top: anchor.top,
                bottom: anchor.bottom,
                // Largeur dynamique : une colonne fixe (rem) par niveau ouvert.
                ['--cnd-panel-width' as any]: `${activeColumns.length * 16}rem`,
                ['--cnd-column-width' as any]: '16rem',
              }}
              initial={{ opacity: 0, y: direction === 'up' ? 10 : -10, scale: 0.96 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                width: 'var(--cnd-panel-width)',
                transition: {
                  opacity: { duration: 0.18 },
                  y: { duration: 0.28, type: 'spring', stiffness: 200, damping: 20 },
                  scale: { duration: 0.18 },
                  width: { duration: 0.28, ease: 'easeOut' },
                },
              }}
              exit={{ opacity: 0, y: direction === 'up' ? 10 : -10, scale: 0.96, transition: { duration: 0.18 } }}
            >
              <div className={styles.panelInner}>
                <AnimatePresence mode="sync">
                  {activeColumns.map((columnItems, columnIndex) => (
                    <ColumnWithSearch
                      key={columnIndex}
                      columnItems={columnItems}
                      columnIndex={columnIndex}
                      activeItems={activeItems}
                      searchable={searchable}
                      searchPlaceholder={searchPlaceholder}
                      onHover={handleItemHover}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CascadingNavDropdown;
