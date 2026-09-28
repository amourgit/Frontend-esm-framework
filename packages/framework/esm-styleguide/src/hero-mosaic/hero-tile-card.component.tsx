/** @category Hero Mosaic */
import React from 'react';
import { motion } from 'framer-motion';
import styles from './hero-mosaic.module.scss';

/** Une tuile de la mosaïque « À la une ». */
export interface HeroTile {
  id: string;
  title: string;
  imageUrl: string;
  /** Texte du lien d'action — uniquement affiché sur la tuile 'large'. */
  linkText?: string;
}

export interface HeroTileCardProps {
  tile: HeroTile;
  size: 'large' | 'medium';
  onSelect: (tile: HeroTile) => void;
  className?: string;
}

/**
 * Carte individuelle de la mosaïque « À la une ». Reçoit sa tuile et sa taille
 * en props : une seule carte réutilisable pour toutes les tuiles, au lieu de
 * cinq blocs JSX quasi identiques dupliqués à la main.
 */
export function HeroTileCard({ tile, size, onSelect, className }: HeroTileCardProps) {
  return (
    <motion.div
      whileHover={{ scale: size === 'large' ? 1.008 : 1.012 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelect(tile)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          // Sans preventDefault, la barre d'espace fait aussi défiler la page.
          e.preventDefault();
          onSelect(tile);
        }
      }}
      className={[styles.tile, size === 'large' ? styles.tileLarge : styles.tileMedium, className ?? ''].join(' ')}
    >
      <img src={tile.imageUrl} alt={tile.title} className={styles.tileImage} referrerPolicy="no-referrer" />
      <div className={styles.tileGradient} />
      <div className={styles.tileContent}>
        {size === 'large' ? (
          <>
            <h3 className={styles.tileTitleLarge}>{tile.title}</h3>
            <span className={styles.tileLink}>{tile.linkText ?? 'En savoir plus →'}</span>
          </>
        ) : (
          <h4 className={styles.tileTitleMedium}>{tile.title}</h4>
        )}
      </div>
    </motion.div>
  );
}
