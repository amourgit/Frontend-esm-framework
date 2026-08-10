/** @category Fields */
import React from 'react';

interface ErrorFilledIconProps {
  className?: string;
  size?: number;
}

/**
 * Icône "erreur" (cercle plein + point d'exclamation), calquée sur le pictogramme
 * `error--filled` de Carbon Design System. Ni le set EGEN (`icons.tsx`) ni
 * `@carbon/react/icons` n'exposent une variante strictement équivalente aux deux
 * autres sévérités déjà couvertes (succès → `CheckmarkFilledIcon`, avertissement →
 * `WarningIcon`), d'où ce SVG inline — voir guide §9.3. `currentColor` uniquement :
 * aucune couleur n'est figée ici, elle est héritée du texte du parent (lui-même
 * piloté par `var(--colors-{success|warning|error}-*)`).
 */
export const ErrorFilledIcon: React.FC<ErrorFilledIconProps> = ({ className, size = 16 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M16,2C8.3,2,2,8.3,2,16s6.3,14,14,14s14-6.3,14-14S23.7,2,16,2z M14.9,8h2.2v11h-2.2V8z M16,23.5c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5s1.5,0.7,1.5,1.5S16.8,23.5,16,23.5z" />
  </svg>
);
