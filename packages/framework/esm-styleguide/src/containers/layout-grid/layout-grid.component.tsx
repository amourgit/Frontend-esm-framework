/** @category LayoutGrid */
import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { motion } from 'framer-motion';
import type { LayoutGridItem, LayoutGridProps } from './layout-grid.types';
import styles from './layout-grid.module.scss';

/**
 * `LayoutGrid` — grille de cartes dont le CONTENU est entièrement fourni par
 * le consommateur (aucune hypothèse sur ce qu'elles affichent — voir la
 * catégorie `containers`). Cliquer une carte l'étire en plein cadre via une
 * transition de layout partagée framer-motion (`layoutId`, effet "magic
 * move" — la vignette glisse et grandit jusqu'à sa position finale plutôt
 * que de sauter) ; les autres cartes restent en place, un voile sombre
 * apparaît derrière ; cliquer le voile referme.
 *
 * Comportement repris à l'identique du composant source. Ajouts (aucun
 * impact visuel — un composant destiné à être partagé entre plusieurs apps
 * doit être utilisable au clavier) : fermeture par `Échap`, cartes
 * activables au clavier (`role="button"`, `tabIndex`, `Entrée`/`Espace`).
 *
 * @example
 * ```tsx
 * <LayoutGrid
 *   items={[
 *     { id: 1, thumbnail: '/photo.jpg', content: <p>Détail de l'élément 1</p> },
 *     { id: 2, thumbnail: '/autre.jpg', content: <p>Détail de l'élément 2</p>, className: 'col-span-2' },
 *   ]}
 * />
 * ```
 */
export function LayoutGrid({ items, className, style }: LayoutGridProps) {
  const [selected, setSelected] = useState<LayoutGridItem | null>(null);
  const [lastSelected, setLastSelected] = useState<LayoutGridItem | null>(null);

  const handleClick = (item: LayoutGridItem) => {
    setLastSelected(selected);
    setSelected(item);
  };

  const handleOutsideClick = () => {
    setLastSelected(selected);
    setSelected(null);
  };

  useEffect(() => {
    if (!selected) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleOutsideClick();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div className={classNames(styles.root, className)} style={style}>
      {items.map((item) => {
        const isSelected = selected?.id === item.id;
        const isLastSelected = !isSelected && lastSelected?.id === item.id;

        return (
          <div key={item.id} className={item.className}>
            <motion.div
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => handleClick(item)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleClick(item);
                }
              }}
              className={classNames(item.className, styles.card, {
                [styles['card--selected']]: isSelected,
                [styles['card--default']]: !isSelected,
                [styles['card--lastSelected']]: isLastSelected,
              })}
              layoutId={`layout-grid-card-${item.id}`}
            >
              {isSelected && <LayoutGridSelectedCard item={selected} />}
              <LayoutGridImage item={item} />
            </motion.div>
          </div>
        );
      })}

      <motion.div
        onClick={handleOutsideClick}
        className={classNames(styles.backdrop, { [styles['backdrop--interactive']]: Boolean(selected?.id) })}
        animate={{ opacity: selected?.id ? 1 : 0 }}
        aria-hidden="true"
      />
    </div>
  );
}

function LayoutGridImage({ item }: { item: LayoutGridItem }) {
  return (
    <motion.img
      layoutId={`layout-grid-image-${item.id}`}
      src={item.thumbnail}
      height={500}
      width={500}
      className={styles.image}
      alt="thumbnail"
    />
  );
}

function LayoutGridSelectedCard({ item }: { item: LayoutGridItem | null }) {
  return (
    <div className={styles.selectedCard}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} className={styles.scrim} />
      <motion.div
        layoutId={`layout-grid-content-${item?.id}`}
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={styles.selectedContent}
      >
        {item?.content}
      </motion.div>
    </div>
  );
}

export default LayoutGrid;
