/** @category FolderGallery */
import type React from 'react';

export interface FolderGalleryItem {
  id: string | number;
  /** Contenu affiché dans la carte — n'importe quel composant React (image, profil, carte produit...). */
  content: React.ReactNode;
}

export interface FolderGalleryProps {
  /** Éléments du dossier — contenu entièrement libre, fourni par le consommateur. */
  items: FolderGalleryItem[];

  // ── Contenu textuel — entièrement personnalisable ──────────────────────────
  /** Libellé affiché sur l'étiquette du dossier fermé. */
  title?: React.ReactNode;
  /** Texte d'indice affiché sous les cartes une fois le dossier ouvert (ex. « glisser vers le bas pour fermer »). */
  hint?: React.ReactNode;

  // ── Ouverture — non contrôlée par défaut, contrôlable si besoin ────────────
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  // ── Apparence — surcharge du thème ──────────────────────────────────────────
  className?: string;
  style?: React.CSSProperties;
  /** Largeur d'une carte repliée/dépliée. Défaut : 14rem. */
  itemWidth?: string;
  /** Hauteur d'une carte repliée/dépliée. Défaut : 18rem. */
  itemHeight?: string;
  /** Couleur d'accent des reflets/bordures du dossier — token du thème (ex. `var(--colors-primary-500)`). Défaut : ton neutre fixe (voir doc du composant). */
  accentColor?: string;
}
