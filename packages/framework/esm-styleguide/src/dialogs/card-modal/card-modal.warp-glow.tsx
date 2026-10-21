/** @category CardModal */
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import styles from './card-modal.module.scss';

const ENTER = 0.5;
const EXIT = 0.25;

const breathing = (reduced: boolean | null) => ({
  opacity: 0.9,
  transition: {
    duration: ENTER,
    scale: { duration: 15, repeat: Infinity, repeatType: 'loop' as const, ease: 'easeInOut' as const, delay: 0.35 },
  },
  ...(reduced ? {} : { scale: [1, 0.7, 1] }),
});

/**
 * Halos lumineux de l'overlay `warp` : une vague qui monte du bas, puis deux
 * halos qui « respirent ». Couleur pilotée par `--card-modal-warp-color`
 * (posée sur le conteneur) — aucune couleur codée en dur.
 */
export const CardModalWarpGlow: React.FC = () => {
  const reduced = useReducedMotion();
  return (
    <div className={styles.warpGlow} aria-hidden="true">
      <motion.div
        className={styles.warpWave}
        initial={{ scale: 0, opacity: 1 }}
        animate={{
          scale: reduced ? 1 : 10,
          opacity: 0.2,
          transition: { duration: ENTER, opacity: { duration: ENTER, ease: 'easeInOut' } },
        }}
        exit={{ scale: 0, opacity: 1, transition: { duration: EXIT } }}
      />
      <motion.div
        className={`${styles.warpBlob} ${styles.warpBlobA}`}
        initial={{ opacity: 0 }}
        animate={breathing(reduced)}
        exit={{ opacity: 0, transition: { duration: EXIT } }}
      />
      <motion.div
        className={`${styles.warpBlob} ${styles.warpBlobB}`}
        initial={{ opacity: 0 }}
        animate={breathing(reduced)}
        exit={{ opacity: 0, transition: { duration: EXIT } }}
      />
    </div>
  );
};
