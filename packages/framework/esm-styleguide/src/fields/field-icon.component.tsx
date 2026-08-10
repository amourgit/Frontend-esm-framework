/** @category Fields */
import React from 'react';
import type { FieldIcon } from './dynamic-field.types';
import styles from './dynamic-field.module.scss';

interface FieldIconComponentProps {
  fieldIcon?: FieldIcon;
  className?: string;
}

/** Rend l'icône de champ (ex. enveloppe pour un email) — jamais l'icône de validation. */
export const FieldIconComponent: React.FC<FieldIconComponentProps> = ({ fieldIcon, className }) => {
  if (!fieldIcon) {
    return null;
  }

  const Icon = fieldIcon.icon;

  return <Icon className={[styles.fieldIconGlyph, className].filter(Boolean).join(' ')} size={16} />;
};
