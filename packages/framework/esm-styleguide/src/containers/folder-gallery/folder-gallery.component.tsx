/** @category FolderGallery */
import React, { useState } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import classNames from 'classnames';
import type { FolderGalleryProps } from './folder-gallery.types';
import styles from './folder-gallery.module.scss';

/**
 * `FolderGallery` — dossier interactif : une pile de cartes repliée dans un
 * dossier stylisé (façon macOS), qui s'ouvre en éventail au clic et se
 * referme en glissant n'importe quelle carte vers le bas.
 *
 * Le dossier ne connaît RIEN du contenu qu'il affiche : `items[].content`
 * accepte n'importe quel composant React (photo, carte de profil, produit,
 * texte...) — c'est un simple conteneur d'affichage/interaction.
 *
 * @example
 * ```tsx
 * <FolderGallery
 *   title="Équipe"
 *   hint="Glissez une carte vers le bas pour fermer"
 *   items={team.map((m) => ({ id: m.id, content: <ProfileCard {...m} /> }))}
 * />
 * ```
 */
export const FolderGallery: React.FC<FolderGalleryProps> = ({
  items,
  title = 'Dossier',
  hint = 'Glisser une carte vers le bas pour fermer',
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  style,
  itemWidth = '14rem',
  itemHeight = '18rem',
  accentColor,
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [hoverFolder, setHoverFolder] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (!isControlled) {
      setInternalOpen(next);
    }
  };

  const handleItemDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 && isOpen) {
      setOpen(false);
      setHoverFolder(false);
    }
  };

  const centerIndex = (items.length - 1) / 2;

  const rootStyle: React.CSSProperties = {
    ...(accentColor ? ({ ['--fg-accent' as any]: accentColor } as React.CSSProperties) : undefined),
    ...style,
  };

  return (
    <div className={classNames(styles.root, className)} style={rootStyle}>
      <div className={styles.wrapper}>
        <div className={styles.stage}>
          {/* Rabat arrière du dossier */}
          <motion.div className={styles.backFlap} animate={{ opacity: isOpen ? 0 : 1, scale: isOpen ? 0.9 : 1 }}>
            <div className={styles.backFlapTab} />
            <div className={styles.backFlapBody} />
            <div className={styles.backFlapInner} />
          </motion.div>

          {/* Cartes */}
          <div className={styles.itemsLayer}>
            {items.map((item, i) => {
              const offset = i - centerIndex;

              const stackY = hoverFolder ? offset * -10 - 40 : offset * -5;
              const stackX = hoverFolder ? offset * 30 : offset * 3;
              const stackRotate = hoverFolder ? offset * 8 : offset * 3;
              const stackScale = 1 - Math.abs(offset) * 0.03;

              const openY = -130;
              const openX = offset * 130;
              const openScale = 1.05;

              return (
                <motion.div
                  key={item.id}
                  drag={isOpen}
                  dragSnapToOrigin
                  onDragEnd={handleItemDragEnd}
                  className={classNames(styles.item, { [styles['item--open']]: isOpen })}
                  style={{ width: itemWidth, height: itemHeight }}
                  animate={
                    !isOpen
                      ? { y: stackY, x: stackX, rotate: stackRotate, scale: stackScale, zIndex: i + 10 }
                      : { y: openY, x: openX, rotate: 0, scale: openScale, zIndex: 50 }
                  }
                  whileHover={isOpen ? { scale: openScale + 0.05, zIndex: 100 } : undefined}
                  whileDrag={isOpen ? { scale: openScale + 0.1, rotate: 5, zIndex: 150 } : undefined}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                >
                  {item.content}
                </motion.div>
              );
            })}
          </div>

          {/* Rabat avant du dossier (déclencheur) */}
          <motion.div
            className={styles.frontFlap}
            animate={{
              opacity: isOpen ? 0 : 1,
              rotateX: hoverFolder ? -25 : 0,
              y: hoverFolder ? 10 : 0,
              pointerEvents: isOpen ? 'none' : 'auto',
            }}
            onMouseEnter={() => setHoverFolder(true)}
            onMouseLeave={() => setHoverFolder(false)}
            onClick={() => setOpen(true)}
          >
            <div className={styles.frontFlapBody}>
              <div className={styles.frontFlapSheen} />
              <div className={styles.label}>
                <span className={styles.labelText}>{title}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {hint && (
          <motion.div animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : 50 }} className={styles.hint}>
            {hint}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FolderGallery;
