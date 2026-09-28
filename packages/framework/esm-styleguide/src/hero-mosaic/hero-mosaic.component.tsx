/** @category Hero Mosaic */
import React from 'react';
import { HeroTileCard, type HeroTile } from './hero-tile-card.component.js';
import styles from './hero-mosaic.module.scss';

export interface HeroMosaicProps {
  mainTile: HeroTile;
  /** Jusqu'à 4 tuiles secondaires, affichées en grille 2×2 à droite/en dessous. */
  secondaryTiles: HeroTile[];
  onSelectTile: (tile: HeroTile) => void;
}

/**
 * Grille « À la une » : une tuile principale et jusqu'à quatre tuiles
 * secondaires, toutes fournies par l'appelant (`mainTile`, `secondaryTiles`).
 */
export function HeroMosaic({ mainTile, secondaryTiles, onSelectTile }: HeroMosaicProps) {
  return (
    <div className={styles.grid}>
      <HeroTileCard tile={mainTile} size="large" onSelect={onSelectTile} />
      {secondaryTiles.slice(0, 4).map((tile) => (
        <HeroTileCard key={tile.id} tile={tile} size="medium" onSelect={onSelectTile} />
      ))}
    </div>
  );
}

/* ============================================================================
 *  GUIDE D'UTILISATION — HeroMosaic
 * ============================================================================
 *    <ContentSection title="À la une">
 *      <HeroMosaic
 *        mainTile={{ id: '1', title: '...', imageUrl: '...', linkText: 'Lire →' }}
 *        secondaryTiles={[{ id: '2', title: '...', imageUrl: '...' }, ...]}
 *        onSelectTile={(tile) => navigate(`/actualites/${tile.id}`)}
 *      />
 *    </ContentSection>
 *
 *  `secondaryTiles` : les 4 premières sont affichées, le reste est ignoré
 *  (mosaïque à 5 emplacements fixes).
 * ==========================================================================*/
