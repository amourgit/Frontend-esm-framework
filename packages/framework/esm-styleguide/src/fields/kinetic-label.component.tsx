/** @category Fields */
import React from 'react';
import { motion, type Variants } from 'framer-motion';
import styles from './dynamic-field.module.scss';

const containerVariants: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

const letterVariants: Variants = {
  initial: {
    y: 0,
    color: 'var(--colors-surface-foreground)',
  },
  animate: {
    y: '-120%',
    color: 'var(--colors-surface-muted-foreground)',
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
};

interface KineticLabelProps {
  label: string;
  active: boolean;
  required?: boolean;
}

/**
 * Label dont chaque lettre s'anime individuellement (décalage vertical +
 * changement de couleur, en cascade via `staggerChildren`) lorsque le champ
 * est actif (focus ou déjà rempli) — utilisé par `DynamicField`
 * `variant="kinetic"`.
 */
export const KineticLabel: React.FC<KineticLabelProps> = ({ label, active, required }) => (
  <motion.span
    className={styles.kineticLabel}
    variants={containerVariants}
    initial="initial"
    animate={active ? 'animate' : 'initial'}
    aria-hidden="true"
  >
    {label.split('').map((char, index) => (
      <motion.span key={index} className={styles.kineticLetter} variants={letterVariants} style={{ willChange: 'transform' }}>
        {char === ' ' ? '\u00A0' : char}
      </motion.span>
    ))}
    {required && <span className={styles.requiredMark}> *</span>}
  </motion.span>
);
