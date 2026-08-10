/** @category CascadingNavDropdown */
import type React from 'react';

/** Un item de navigation, potentiellement récursif (sous-menu en cascade). */
export interface NavigationItem {
  id: string;
  label: string;
  /** Chemin/URL de destination — passé tel quel à `onNavigate`. Optionnel pour un item purement conteneur (n'a que des enfants). */
  path?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  children?: NavigationItem[];
}

/** Direction d'ouverture du panneau. */
export type CascadingNavDropdownDirection = 'down' | 'up';

export interface CascadingNavDropdownProps {
  /** Arborescence de navigation — AUCUNE valeur par défaut : à fournir intégralement par le consommateur. */
  items: NavigationItem[];
  /** Libellé du bouton déclencheur. */
  triggerLabel?: string;
  /** Icône du bouton déclencheur (optionnelle). */
  triggerIcon?: React.ComponentType<{ className?: string; size?: number }>;
  /** Sens d'ouverture : 'down' glisse vers le bas depuis le déclencheur, 'up' glisse vers le haut. */
  direction?: CascadingNavDropdownDirection;
  /** Affiche un champ de recherche en tête de chaque colonne. */
  searchable?: boolean;
  /** Texte du placeholder de recherche. */
  searchPlaceholder?: string;
  onNavigate?: (path: string) => void;
  className?: string;
}
