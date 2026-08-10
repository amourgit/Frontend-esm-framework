/** @category CircularGallery */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { ChevronLeftIcon, ChevronRightIcon } from '../../icons';
import { GalleryImage } from './gallery-image.component';
import { GalleryTabs } from './gallery-tabs.component';
import type { CircularGalleryProps } from './circular-gallery.types';
import styles from './circular-gallery.module.scss';

/**
 * `CircularGallery` — galerie où chaque image est une petite pastille
 * circulaire (rangée d'onglets en bas) qui se déploie en plein cadre au
 * clic, avec un rebond à la fermeture (GSAP `MotionPathPlugin`).
 *
 * Repris à l'identique de l'original : navigation précédent/suivant
 * désactivée pendant la transition (`disabled`), défilement automatique
 * (réinitialisé à chaque changement manuel), timeline GSAP en 3 temps par
 * image. Seule différence d'infrastructure : `gsap`/`MotionPathPlugin` sont
 * importés normalement (déjà des dépendances npm du package, ajoutées pour
 * `StaggeredMenuPanel`) au lieu d'être chargés depuis un CDN à l'exécution
 * via injection de `<script>` — ce hack n'a plus lieu d'être ici, et
 * n'aurait de toute façon pas fonctionné (domaine cdnjs.cloudflare.com non
 * autorisé par la politique réseau du projet).
 */
export const CircularGallery: React.FC<CircularGalleryProps> = ({ images, autoplay = true, autoplayInterval = 4500, className, style }) => {
  const [opened, setOpened] = useState(0);
  const [inPlace, setInPlace] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const autoplayTimer = useRef<number | null>(null);

  const onClick = (index: number) => {
    if (!disabled) setOpened(index);
  };

  const onInPlace = (index: number) => setInPlace(index);

  const next = useCallback(() => {
    setOpened((currentOpened) => {
      let nextIndex = currentOpened + 1;
      if (nextIndex >= images.length) nextIndex = 0;
      return nextIndex;
    });
  }, [images.length]);

  const prev = useCallback(() => {
    setOpened((currentOpened) => {
      let prevIndex = currentOpened - 1;
      if (prevIndex < 0) prevIndex = images.length - 1;
      return prevIndex;
    });
  }, [images.length]);

  // Désactive les clics pendant la transition
  useEffect(() => setDisabled(true), [opened]);
  useEffect(() => setDisabled(false), [inPlace]);

  // Défilement automatique — réinitialisé à chaque changement (manuel ou auto)
  useEffect(() => {
    if (!autoplay) {
      return;
    }
    if (autoplayTimer.current) {
      clearInterval(autoplayTimer.current);
    }
    autoplayTimer.current = window.setInterval(next, autoplayInterval);
    return () => {
      if (autoplayTimer.current) {
        clearInterval(autoplayTimer.current);
      }
    };
  }, [opened, autoplay, autoplayInterval, next]);

  return (
    <div className={classNames(styles.root, className)} style={style}>
      <div className={styles.frame}>
        {images.map((image, i) => (
          <div key={image.url} className={styles.imageLayer} style={{ zIndex: inPlace === i ? i : images.length + 1 }}>
            <GalleryImage
              total={images.length}
              id={i}
              url={image.url}
              title={image.title}
              open={opened === i}
              inPlace={inPlace === i}
              onInPlace={onInPlace}
            />
          </div>
        ))}
        <div className={styles.tabsLayer}>
          <GalleryTabs images={images} onSelect={onClick} />
        </div>
      </div>

      <button
        type="button"
        className={classNames(styles.navButton, styles['navButton--prev'])}
        onClick={prev}
        disabled={disabled}
        aria-label="Image précédente"
      >
        <ChevronLeftIcon size={28} />
      </button>

      <button
        type="button"
        className={classNames(styles.navButton, styles['navButton--next'])}
        onClick={next}
        disabled={disabled}
        aria-label="Image suivante"
      >
        <ChevronRightIcon size={28} />
      </button>
    </div>
  );
};

export default CircularGallery;
