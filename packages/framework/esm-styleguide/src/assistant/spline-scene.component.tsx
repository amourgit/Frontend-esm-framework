'use client';

import React, { useEffect, useState } from 'react';
import Spline from '@splinetool/react-spline';

interface SplineSceneProps {
  scene: string;
  className?: string;
  onLoad?: (splineApp: unknown) => void;
}

// Global preload helper to pre-fetch the 1.3MB 3D scene immediately into browser cache
if (typeof window !== 'undefined') {
  const PRELOAD_URL = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";
  // Preload link tag
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'fetch';
  link.crossOrigin = 'anonymous';
  link.href = PRELOAD_URL;
  document.head.appendChild(link);

  // Background fetch to cache it in memory
  fetch(PRELOAD_URL, { mode: 'cors' }).catch(() => {});
}

export function SplineScene({ scene, className = 'w-full h-full', onLoad }: SplineSceneProps) {
  const [isLoaded, setIsLoaded] = useState(false);

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
        <Spline
          scene={scene}
          className="w-full h-full"
          onLoad={(splineApp) => {
            setIsLoaded(true);
            if (onLoad) onLoad(splineApp);
          }}
        />
      </div>
    </div>
  );
}

export default SplineScene;
