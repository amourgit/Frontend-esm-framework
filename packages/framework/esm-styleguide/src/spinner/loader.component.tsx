import React, { useEffect, useState } from 'react';
import { loaderMarkup } from './loader-markup.js';

export interface LoaderProps {
  /** Affiche (true) ou masque (false) le loader ; le masquage joue une sortie en fondu. */
  visible?: boolean;
  /** Couvre uniquement le conteneur parent (qui doit être `position: relative`) au lieu de la page. */
  local?: boolean;
  /** Taille du pictogramme en pixels. */
  size?: number;
  /** Libellé accessible. */
  label?: string;
}

const EXIT_MS = 300;

/**
 * Loader EGEN réutilisable (overlay flouté + spinner SVG). Même rendu que le loader de page
 * du shell. Exemple : `<Loader visible={isLoading} local />` dans une carte `position: relative`.
 */
export function Loader({ visible = true, local = false, size = 160, label }: LoaderProps) {
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`egen-loader-overlay ${local ? 'egen-loader-overlay--local ' : ''}${
        visible ? 'egen-anim-fade-in' : 'egen-anim-fade-out'
      }`}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: loaderMarkup(size, label) }}
    />
  );
}
