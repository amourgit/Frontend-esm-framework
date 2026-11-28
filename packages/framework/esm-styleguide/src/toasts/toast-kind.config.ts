/** @category Toast */
import type React from 'react';
import { CheckmarkFilledIcon, ErrorFilledIcon, InformationFilledIcon, InformationSquareIcon, WarningIcon } from '../icons/index.js';
import type { ToastType } from './toast.types.js';

export interface ToastKindConfig {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  /** Libellé de catégorie par défaut (utilisé si `eyebrow` n'est pas fourni). */
  defaultEyebrow: string;
  /** Famille de couleur du toast (sélectionne la classe de style `card--{colorToken}`). */
  colorToken: 'success' | 'error' | 'warning' | 'info';
  /** Couleur d'accent du toast : variable du thème (`destructive`) ou constante du styleguide (`success-500`…). */
  colorVar: string;
}

export const toastKindConfig: Record<ToastType, ToastKindConfig> = {
  success: { icon: CheckmarkFilledIcon, defaultEyebrow: 'Succès', colorToken: 'success', colorVar: 'var(--success)' },
  error: { icon: ErrorFilledIcon, defaultEyebrow: 'Erreur', colorToken: 'error', colorVar: 'var(--destructive)' },
  warning: { icon: WarningIcon, defaultEyebrow: 'Avertissement', colorToken: 'warning', colorVar: 'var(--warning)' },
  'warning-alt': { icon: WarningIcon, defaultEyebrow: 'Avertissement', colorToken: 'warning', colorVar: 'var(--warning)' },
  info: { icon: InformationFilledIcon, defaultEyebrow: 'Information', colorToken: 'info', colorVar: 'var(--info)' },
  'info-square': { icon: InformationSquareIcon, defaultEyebrow: 'Information', colorToken: 'info', colorVar: 'var(--info)' },
};
