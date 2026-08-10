/** @category DecoratedCard */
import React from 'react';
import styles from './decorated-card.module.scss';

export const DotsPattern: React.FC<{ dotsColor?: string }> = ({ dotsColor }) => (
  <>
    <div className={styles.hLineTop} />
    <div className={styles.hLineBottom} />
    <div className={styles.dotsFrame}>
      <div className={styles.dotsGrid}>
        <span className={styles.dot} style={{ background: dotsColor, transform: 'translateX(-2.5px)' }} />
        <span className={styles.dot} style={{ background: dotsColor, transform: 'translateX(2.5px)', justifySelf: 'end' }} />
        <span className={styles.dot} style={{ background: dotsColor, transform: 'translateX(-2.5px)' }} />
        <span className={styles.dot} style={{ background: dotsColor, transform: 'translateX(2.5px)', justifySelf: 'end' }} />
      </div>
    </div>
  </>
);

export const GradientLines: React.FC = () => (
  <>
    <div className={styles.gradientLineTop} />
    <div className={styles.gradientLineBottom} />
    <div className={styles.gradientSideLeft} />
    <div className={styles.gradientSideRight} />
  </>
);

const PLUS_POSITIONS = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const;

export const PlusIcons: React.FC = () => (
  <>
    {PLUS_POSITIONS.map((pos) => (
      <svg
        key={pos}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        width={24}
        height={24}
        className={`${styles.plusIcon} ${styles[`plusIcon--${pos}`]}`}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
      </svg>
    ))}
  </>
);

export const CornerBrackets: React.FC = () => (
  <>
    <div className={`${styles.cornerBracket} ${styles['cornerBracket--topLeft']}`} />
    <div className={`${styles.cornerBracket} ${styles['cornerBracket--topRight']}`} />
    <div className={`${styles.cornerBracket} ${styles['cornerBracket--bottomLeft']}`} />
    <div className={`${styles.cornerBracket} ${styles['cornerBracket--bottomRight']}`} />
  </>
);
