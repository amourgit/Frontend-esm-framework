/** @category TestimonialCard */
import type React from 'react';

/**
 * Position d'une carte dans la pile — pilote son `zIndex`, sa rotation et son
 * décalage horizontal (voir `TestimonialCard`). Seule la carte `'front'` est
 * glissable (`dragListener`).
 */
export type TestimonialCardPosition = 'front' | 'middle' | 'back';

export interface TestimonialCardProps {
  /**
   * Identifiant unique du témoignage. Sert aussi de base à l'avatar de démo
   * par défaut (`pravatar.cc`) tant que `avatarUrl` n'est pas fourni.
   */
  id: number;
  /** Texte du témoignage, affiché entre guillemets en italique. */
  testimonial: string;
  /** Nom de l'auteur du témoignage. */
  author: string;
  /**
   * Position de la carte dans la pile. Pilotée par l'orchestrateur parent
   * (`TestimonialCardStack`) — ce composant ne gère aucun état de pile
   * lui-même.
   */
  position: TestimonialCardPosition;
  /**
   * Appelé quand la carte `'front'` est glissée de plus de 150px vers la
   * gauche — signal pour l'orchestrateur de faire tourner la pile d'un cran.
   */
  handleShuffle: () => void;
  /**
   * URL de l'avatar. Par défaut : service de démo `pravatar.cc` basé sur
   * `id` — à toujours fournir explicitement en production.
   */
  avatarUrl?: string;
  /** Largeur de la carte, en px. Défaut : 350. */
  cardWidth?: number;
  /** Hauteur de la carte, en px. Défaut : 450. */
  cardHeight?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Un témoignage de la pile, consommé par `TestimonialCardStack`. */
export interface TestimonialItem {
  /** Identifiant unique — sert de `key` React et de base à l'avatar de démo. */
  id: number;
  /** Texte du témoignage. */
  testimonial: string;
  /** Nom de l'auteur. */
  author: string;
  /** URL de l'avatar. Par défaut : service de démo `pravatar.cc` basé sur `id`. */
  avatarUrl?: string;
}

export interface TestimonialCardStackProps {
  /** Liste des témoignages à empiler. L'ordre initial détermine la carte de devant. */
  testimonials: TestimonialItem[];
  /** Largeur d'une carte, en px. Défaut : 350. */
  cardWidth?: number;
  /** Hauteur d'une carte, en px. Défaut : 450. */
  cardHeight?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Appelé après qu'une carte ait été glissée hors du premier plan, avec l'`id` du témoignage concerné. */
  onShuffle?: (id: number) => void;
}
