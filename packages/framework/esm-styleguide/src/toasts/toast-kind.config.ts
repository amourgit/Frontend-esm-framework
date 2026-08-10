/** @category Toast */
import type React from 'react';
import { CheckmarkFilledIcon, ErrorFilledIcon, InformationFilledIcon, InformationSquareIcon, WarningIcon } from '../icons';
import type { ToastType } from './toast.types';

export interface ToastKindConfig {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  /** Libellé de catégorie par défaut (utilisé si `eyebrow` n'est pas fourni). */
  defaultEyebrow: string;
  /** Racine des tokens de couleur du thème (`--colors-{colorToken}-*`). */
  colorToken: 'success' | 'error' | 'warning' | 'info';
}

export const toastKindConfig: Record<ToastType, ToastKindConfig> = {
  success: { icon: CheckmarkFilledIcon, defaultEyebrow: 'Succès', colorToken: 'success' },
  error: { icon: ErrorFilledIcon, defaultEyebrow: 'Erreur', colorToken: 'error' },
  warning: { icon: WarningIcon, defaultEyebrow: 'Avertissement', colorToken: 'warning' },
  'warning-alt': { icon: WarningIcon, defaultEyebrow: 'Avertissement', colorToken: 'warning' },
  info: { icon: InformationFilledIcon, defaultEyebrow: 'Information', colorToken: 'info' },
  'info-square': { icon: InformationSquareIcon, defaultEyebrow: 'Information', colorToken: 'info' },
};
