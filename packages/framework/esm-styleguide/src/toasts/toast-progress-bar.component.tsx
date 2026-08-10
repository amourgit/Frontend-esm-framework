/** @category Toast */
import React from 'react';
import { motion } from 'framer-motion';
import styles from './toast.module.scss';

interface ToastProgressBarProps {
  colorVar: string;
  mode: 'countdown' | 'progress';
  /** ms — requis en mode 'countdown'. */
  durationMs?: number;
  /** 0-100 — requis en mode 'progress'. */
  value?: number;
}

export const ToastProgressBar: React.FC<ToastProgressBarProps> = ({ colorVar, mode, durationMs, value }) => (
  <div className={styles.progressTrack}>
    {mode === 'countdown' ? (
      <motion.div
        className={styles.progressFill}
        style={{ background: colorVar }}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: (durationMs ?? 4000) / 1000, ease: 'linear' }}
      />
    ) : (
      <motion.div
        className={styles.progressFill}
        style={{ background: colorVar }}
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    )}
  </div>
);
