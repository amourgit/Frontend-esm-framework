/** @category Fields */
import type React from 'react';

/** Type Carbon-safe accepté pour les icônes d'un champ (EGEN set, `@carbon/react/icons`, ou tout composant SVG custom respectant `currentColor`). */
export type FieldIconComponent = React.ComponentType<{ className?: string; size?: number }>;

/** Niveau de sévérité d'une règle de validation. */
export type ValidationRuleType = 'warning' | 'error' | 'success';

/** Une règle de validation unitaire, évaluée sur la valeur courante du champ. */
export interface ValidationRule {
  /** Expression régulière — la règle "échoue" quand `regex.test(value)` est `false`. */
  regex: RegExp;
  /** Message affiché sous le champ quand la règle est active. */
  message: string;
  /** Sévérité, qui pilote la couleur (tokens `--colors-{type}-*`) et l'icône affichée. */
  type: ValidationRuleType;
}

/** Configuration complète de la validation d'un champ. */
export interface ValidationConfig {
  /** Règles évaluées dans l'ordre ; la première qui échoue est affichée. */
  rules: ValidationRule[];
  /** Active la validation à chaque frappe (sinon, seule une validation manuelle via `onValidationChange` a lieu). */
  realTimeValidation?: boolean;
  /** Déclenche `navigator.vibrate()` (si supporté par le device) lors d'un changement de sévérité. */
  triggerVibration?: boolean;
  /** Affiche l'icône de sévérité à droite du champ. */
  showIcons?: boolean;
  /** Affiche le message texte sous le champ. */
  showMessages?: boolean;
}

/** Position de l'icône de champ (distincte de l'icône de validation). */
export type FieldIconPosition = 'left' | 'label';

/** Icône associée au champ (ex : une icône "email" à gauche du texte). */
export interface FieldIcon {
  icon: FieldIconComponent;
  position?: FieldIconPosition;
}

/** Variante visuelle du champ — toutes trois pilotées à 100% par les tokens du thème EGEN. */
export type DynamicFieldVariant = 'filled' | 'standard' | 'outlined' | 'kinetic';

/** Taille du champ — mappée sur les tailles `--panel-*` du thème (`panel-size`). */
export type DynamicFieldSize = 'sm' | 'md' | 'lg';

export type DynamicFieldInputType = 'text' | 'email' | 'password' | 'tel' | 'url' | 'number' | 'search';

export interface DynamicFieldProps {
  /** Variante visuelle : bordure inférieure sur fond plein (`filled`), bordure inférieure sur fond transparent (`standard`), ou cadre complet façon "panel" (`outlined`). */
  variant?: DynamicFieldVariant;
  /** Taille du champ. */
  size?: DynamicFieldSize;
  label?: string;
  placeholder?: string;
  type?: DynamicFieldInputType;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  id?: string;
  name?: string;

  /** Icône de champ (différente de l'icône de validation). */
  fieldIcon?: FieldIcon;

  /** Configuration de validation. */
  validation?: ValidationConfig;

  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onValidationChange?: (validation: ValidationRule | null) => void;
}

export const defaultValidation: ValidationConfig = {
  rules: [],
  realTimeValidation: true,
  triggerVibration: true,
  showIcons: true,
  showMessages: true,
};
