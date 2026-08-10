/** @category LiquidGlassCard */
import type React from 'react';

export type GlassBlurIntensity = 'sm' | 'md' | 'lg' | 'xl';
export type GlassShadowIntensity = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type GlassGlowIntensity = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface LiquidGlassCardProps {
  children: React.ReactNode;
  className?: string;
  /** Rend la carte glissable (drag libre, revient à sa position au relâchement). */
  draggable?: boolean;
  /** Rend la carte cliquable pour basculer entre une taille repliée et une taille dépliée. */
  expandable?: boolean;
  width?: string;
  height?: string;
  expandedWidth?: string;
  expandedHeight?: string;
  /** Intensité du flou de fond (verre dépoli). */
  blurIntensity?: GlassBlurIntensity;
  /** Intensité de l'ombre interne (reflet de bordure du verre). */
  shadowIntensity?: GlassShadowIntensity;
  /** Intensité de la lueur externe (glow) sous la carte. */
  glowIntensity?: GlassGlowIntensity;
  borderRadius?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}
