/** @category EntityDetailBrowser */
import type React from 'react';

export interface EntityDetailBrowserItem {
  id: string | number;
  title: React.ReactNode;
  /** Étiquette secondaire libre affichée à droite de l'item (ex. durée, date, quantité...). */
  meta?: React.ReactNode;
  /** Contenu affiché en tête du panneau de détail (ex. auteurs, contributeurs...). ReactNode libre — inclut ses propres icônes si besoin. */
  credits?: React.ReactNode;
  /** Contenu du panneau de détail. Si omis, l'item n'ouvre aucun détail au clic. */
  detail?: React.ReactNode;
}

export interface EntityDetailBrowserRelatedEntity {
  name: React.ReactNode;
  photoUrl: string;
  category?: React.ReactNode;
  itemCountLabel?: React.ReactNode;
  statLabel?: React.ReactNode;
  description?: React.ReactNode;
}

export interface EntityDetailBrowserProps {
  /** Titre de l'entité principale. */
  title: React.ReactNode;
  coverImageUrl: string;
  category?: React.ReactNode;
  itemCountLabel?: React.ReactNode;
  meta?: React.ReactNode;
  /** Sous-éléments consultables — aucune donnée statique, tout vient d'ici. */
  items: EntityDetailBrowserItem[];
  /** Entité liée (ex. auteur, propriétaire, catégorie parente...) — le bouton bascule ce panneau si fourni. */
  relatedEntity?: EntityDetailBrowserRelatedEntity;
  /** Appelé au clic sur le bouton "options" d'un item. */
  onItemOptionsClick?: (item: EntityDetailBrowserItem) => void;
  className?: string;
  style?: React.CSSProperties;
}
