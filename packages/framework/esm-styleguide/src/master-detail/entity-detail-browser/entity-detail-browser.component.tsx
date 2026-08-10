/** @category EntityDetailBrowser */
import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { AddIcon, OverflowMenuHorizontalIcon } from '../../icons';
import { GradientBlur } from './gradient-blur.component';
import type { EntityDetailBrowserItem, EntityDetailBrowserProps } from './entity-detail-browser.types';
import styles from './entity-detail-browser.module.scss';

/**
 * `EntityDetailBrowser` — entité principale (image + métadonnées) et sa
 * liste de sous-éléments consultables, avec deux panneaux superposés :
 * - un panneau de DÉTAIL D'ITEM (`item.detail`), qui s'ouvre en glissant
 *   depuis la ligne de l'item cliqué (position calculée dynamiquement) ;
 * - un panneau d'ENTITÉ LIÉE (`relatedEntity`), qui bascule en overlay avec
 *   fond assombri (ex. auteur, propriétaire, catégorie parente...).
 *
 * Générique et sans hypothèse de domaine : convient aussi bien à un cours et
 * ses leçons, un rôle et ses permissions, un produit et ses offres, etc.
 * Aucune donnée n'est en dur : tout vient des props.
 *
 * @example
 * ```tsx
 * <EntityDetailBrowser
 *   title="Introduction à React"
 *   coverImageUrl={cover}
 *   category="Développement web"
 *   itemCountLabel="8 leçons"
 *   items={lessons}
 *   relatedEntity={{ name: 'Amour N.', photoUrl: photo, category: 'Formateur', description: '...' }}
 * />
 * ```
 */
export const EntityDetailBrowser: React.FC<EntityDetailBrowserProps> = ({
  title,
  coverImageUrl,
  category,
  itemCountLabel,
  meta,
  items,
  relatedEntity,
  onItemOptionsClick,
  className,
  style,
}) => {
  const [isRelatedPanelActive, setIsRelatedPanelActive] = useState(false);
  const [activeItemId, setActiveItemId] = useState<EntityDetailBrowserItem['id'] | null>(null);
  // Contenu du DERNIER item ouvert — volontairement PAS remis à null à la
  // fermeture (seul 'activeItemId' l'est), pour que le panneau reste monté
  // et que sa transition de fermeture (max-height/opacity) puisse réellement
  // se jouer, au lieu de démonter le contenu instantanément.
  const [displayedItem, setDisplayedItem] = useState<EntityDetailBrowserItem | null>(null);
  const [itemModalTop, setItemModalTop] = useState(0);
  const [itemModalTransform, setItemModalTransform] = useState('translateY(0px)');

  const contentRef = useRef<HTMLDivElement>(null);
  const itemRowRefs = useRef(new Map<EntityDetailBrowserItem['id'], HTMLDivElement>());

  const isItemModalActive = activeItemId !== null;
  const anyPanelActive = isRelatedPanelActive || isItemModalActive;

  const setItemRowRef = (id: EntityDetailBrowserItem['id']) => (el: HTMLDivElement | null) => {
    if (el) {
      itemRowRefs.current.set(id, el);
    } else {
      itemRowRefs.current.delete(id);
    }
  };

  useEffect(() => {
    if (activeItemId === null) {
      return;
    }
    const updatePosition = () => {
      const row = itemRowRefs.current.get(activeItemId);
      if (row && contentRef.current) {
        const top = row.getBoundingClientRect().top - contentRef.current.offsetTop - 2;
        setItemModalTop(top);
      }
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [activeItemId]);

  const handleRelatedToggle = () => setIsRelatedPanelActive((prev) => !prev);

  const handleItemOpen = (item: EntityDetailBrowserItem) => {
    if (!item.detail) {
      return;
    }
    const row = itemRowRefs.current.get(item.id);
    if (row && contentRef.current) {
      const distanceY = window.innerHeight - row.getBoundingClientRect().bottom + contentRef.current.offsetTop - 390;
      setItemModalTransform(`translateY(${distanceY}px)`);
    }
    setActiveItemId(item.id);
    setDisplayedItem(item);
  };

  const handleItemClose = () => {
    setItemModalTransform('translateY(0px)');
    setActiveItemId(null);
  };

  return (
    <div className={classNames(styles.root, className)} style={style}>
      <div className={styles.contentWrapper}>
        <div ref={contentRef} className={classNames(styles.content, { [styles['content--active']]: anyPanelActive })}>
          <div className={styles.mainContent}>
            <div className={styles.photoWrapper}>
              <img className={styles.photo} src={coverImageUrl} alt="" />
              <img className={classNames(styles.photo, styles.photoBlur)} src={coverImageUrl} alt="" aria-hidden="true" />
            </div>

            <div className={styles.mainInfo}>
              <div className={styles.titleContainer}>
                <h1 className={styles.title}>{title}</h1>
                <div className={styles.titleInfo}>
                  {category && <p className={styles.light}>{category}</p>}
                  {category && itemCountLabel && <div className={styles.divider} />}
                  {itemCountLabel && <p className={styles.light}>{itemCountLabel}</p>}
                  {itemCountLabel && meta && <div className={styles.divider} />}
                  {meta && <p className={styles.light}>{meta}</p>}
                </div>
              </div>

              <div className={styles.items}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    ref={setItemRowRef(item.id)}
                    className={styles.item}
                    onClick={() => handleItemOpen(item)}
                  >
                    <p className={styles.bold}>{item.title}</p>
                    <div className={styles.end}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          onItemOptionsClick?.(item);
                        }}
                        aria-label="Options"
                      >
                        <OverflowMenuHorizontalIcon size={20} />
                      </button>
                      {item.meta && <p className={styles.light}>{item.meta}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Panneau de détail de l'item ──
               Rendu dès qu'un item a déjà été ouvert au moins une fois
               (displayedItem), pas seulement pendant qu'il est actif — sinon
               le démontage instantané à la fermeture empêcherait la
               transition de fermeture de se jouer. */}
          {displayedItem && (
            <div
              className={classNames(styles.itemModal, { [styles['itemModal--active']]: isItemModalActive })}
              style={{ top: `${itemModalTop}px`, transform: itemModalTransform }}
            >
              <div className={styles.item}>
                <p className={styles.bold}>{displayedItem.title}</p>
                <div className={styles.end}>
                  <button type="button" className={styles.iconButton} onClick={handleItemClose} aria-label="Fermer">
                    <AddIcon size={20} className={styles.closeIconRotated} />
                  </button>
                  {displayedItem.meta && <p className={styles.light}>{displayedItem.meta}</p>}
                </div>
              </div>
              <div className={styles.itemModalInfo}>
                {displayedItem.credits && <div className={styles.itemCredits}>{displayedItem.credits}</div>}
                {displayedItem.detail}
              </div>
              <GradientBlur />
            </div>
          )}

          {/* ── Panneau d'entité liée ── */}
          {relatedEntity && (
            <div
              className={styles.relatedPanel}
              style={{ display: isRelatedPanelActive ? 'flex' : isItemModalActive ? 'none' : undefined }}
            >
              <button
                type="button"
                className={styles.toggle}
                onClick={handleRelatedToggle}
                aria-label={isRelatedPanelActive ? 'Fermer' : 'Voir les détails'}
              >
                <AddIcon size={24} className={classNames({ [styles.closeIconRotated]: isRelatedPanelActive })} />
              </button>
              <div className={styles.relatedContent}>
                <div className={styles.photoWrapper}>
                  <h1 className={styles.title}>{relatedEntity.name}</h1>
                  <img className={styles.photo} src={relatedEntity.photoUrl} alt="" />
                  <img className={classNames(styles.photo, styles.photoBlur)} src={relatedEntity.photoUrl} alt="" aria-hidden="true" />
                </div>
                <div className={styles.info}>
                  <div className={styles.infoTop}>
                    <div className={styles.infoTopLeft}>
                      {relatedEntity.category && <p className={classNames(styles.light, styles.category)}>{relatedEntity.category}</p>}
                      {relatedEntity.category && relatedEntity.itemCountLabel && <div className={styles.divider} />}
                      {relatedEntity.itemCountLabel && <p className={styles.light}>{relatedEntity.itemCountLabel}</p>}
                    </div>
                    {relatedEntity.statLabel && <p className={styles.light}>{relatedEntity.statLabel}</p>}
                  </div>
                  {relatedEntity.description && <p className={styles.bold}>{relatedEntity.description}</p>}
                </div>
              </div>
              <GradientBlur />
              <div className={styles.shade} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EntityDetailBrowser;
