/** @module @category UI */
import type React from 'react';

export interface ToastAction {
  /** Identifiant optionnel (utile en clé React si plusieurs actions). */
  id?: string;
  label: string;
  onClick: () => void;
  /** Style visuel du bouton — 'primary' (défaut), 'secondary', ou 'danger'. */
  kind?: 'primary' | 'secondary' | 'danger';
  /** Ferme le toast après le clic. Défaut : true. */
  closeOnClick?: boolean;
}

/** Structure du toast — 'default' (comportement historique), 'transfer' (barre de progression temps réel), 'actions' (une ou plusieurs commandes). */
export type ToastVariant = 'default' | 'transfer' | 'actions';

export type ToastType = 'error' | 'info' | 'info-square' | 'success' | 'warning' | 'warning-alt';

export interface ToastProps {
  toast: ToastNotificationMeta;
  closeToast(): void;
}

export interface ToastDescriptor {
  description: React.ReactNode;
  /** @deprecated Conservé pour compatibilité — préférer `actions`. Toujours pleinement supporté. */
  onActionButtonClick?: () => void;
  /** @deprecated Conservé pour compatibilité — préférer `actions`. Toujours pleinement supporté. */
  actionButtonLabel?: string;
  kind?: ToastType;
  critical?: boolean;
  title?: string;

  // ── Champs additifs (n'affectent aucun appelant existant qui ne les fournit pas) ──
  /** Structure d'affichage. Défaut : 'default'. */
  variant?: ToastVariant;
  /** Libellé de catégorie affiché au-dessus du titre (ex. "Succès"). Personnalisable ; sinon déduit de `kind`. */
  eyebrow?: string;
  /** Progression 0-100, utilisée par `variant: 'transfer'`. Rappeler `showToast` avec un `toastKey` identique et une valeur mise à jour anime la barre en temps réel sans redéclencher l'animation d'entrée. */
  progress?: number;
  /** Une ou plusieurs commandes, utilisées par `variant: 'actions'` (fonctionne aussi en complément d'un toast 'default'). */
  actions?: ToastAction[];
  /** Délai avant fermeture automatique (ms). `0` ou `undefined` désactive l'auto-fermeture pour 'transfer'/'actions' ; 4000ms par défaut pour 'default' sans actions. */
  duration?: number;
  /** Identité stable pour les mises à jour en temps réel (ex. progression) : deux appels `showToast` avec le même `toastKey` mettent à jour LE MÊME toast au lieu d'en empiler un nouveau. */
  toastKey?: string;
}

export interface ToastNotificationMeta extends ToastDescriptor {
  id: number;
}
