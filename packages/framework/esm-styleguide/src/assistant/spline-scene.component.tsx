'use client';

import React, { Suspense, lazy, useState } from 'react';
import { isNativeTarget } from '@egen-civitas/esm-globals';

// Spline (runtime WebGL ~ plusieurs centaines de Ko) est chargé à la demande : importer le
// styleguide ne doit JAMAIS déclencher de téléchargement ni d'effet de bord réseau.
const Spline = lazy(() => import('@splinetool/react-spline'));

interface SplineSceneProps {
  scene: string;
  className?: string;
  onLoad?: (splineApp: unknown) => void;
}

const preloaded = new Set<string>();

/**
 * Préchauffe le cache navigateur avec une scène Spline (~1,3 Mo). À appeler explicitement
 * (ouverture de l'assistant, idle…) — jamais au chargement du module.
 */
export function preloadSplineScene(url: string): void {
  // Natif : la scène n'est jamais affichée (voir `SplineScene`), donc jamais téléchargée.
  if (typeof document === 'undefined' || isNativeTarget() || preloaded.has(url)) return;
  preloaded.add(url);
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'fetch';
  link.crossOrigin = 'anonymous';
  link.href = url;
  document.head.appendChild(link);
}

export function SplineScene({ scene, className = 'w-full h-full', onLoad }: SplineSceneProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Cible NATIVE : la CSP (`script-src 'self'`, sans `unsafe-eval` ni `wasm-unsafe-eval`) interdit le runtime Spline,
  // qui génère du code à l'exécution (`Function(...)`) et compile du WebAssembly ; la scène est de plus une ressource
  // distante hors `connect-src`. On n'affaiblit pas la CSP pour un décor : en natif le composant ne charge RIEN et
  // rend un conteneur vide de même taille. Web inchangé.
  if (isNativeTarget()) {
    return <div className={`relative ${className} overflow-hidden`} data-egen-3d="unavailable" data-testid="spline-unavailable" aria-hidden="true" />;
  }

  return (
    <div className={`relative ${className} overflow-hidden`}>
      {/* Loading placeholder only until the WebGL scene is ready */}
      {!isLoaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#030708] text-teal-400 gap-3 transition-opacity duration-300">
          <div className="w-10 h-10 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono tracking-widest text-teal-300/80 uppercase animate-pulse">
            Initialisation Robot 3D...
          </span>
        </div>
      )}

      {/* Spline 3D canvas */}
      <div className={`w-full h-full transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <Suspense fallback={null}>
          <Spline
            scene={scene}
            className="w-full h-full"
            onLoad={(splineApp) => {
              setIsLoaded(true);
              if (onLoad) onLoad(splineApp);
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}

export default SplineScene;
