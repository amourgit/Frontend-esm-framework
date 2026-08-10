/** @category EntityDetailBrowser */
import React from 'react';
import styles from './entity-detail-browser.module.scss';

/**
 * Effet de flou progressif (8 couches, flou croissant + masque en dégradé) —
 * technique classique pour estomper un contenu qui déborde sous un panneau,
 * sans dégradé de couleur opaque qui masquerait brutalement le texte.
 */
export const GradientBlur: React.FC = () => (
  <div className={styles.gradientBlur} aria-hidden="true">
    {Array.from({ length: 8 }, (_, i) => (
      <div key={i} className={styles.gradientBlurLayer} />
    ))}
  </div>
);
