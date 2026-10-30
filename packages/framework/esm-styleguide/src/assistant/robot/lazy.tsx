'use client';

import React, { Suspense, lazy } from 'react';
import type { RobotStageProps } from './RobotStage.js';

// `three` et `@react-three/fiber` pèsent plusieurs centaines de Ko : on ne les télécharge qu'au
// premier affichage du robot. Importer le styleguide ne doit JAMAIS déclencher ce chargement.
const RobotStage = lazy(() => import('./RobotStage.js').then((m) => ({ default: m.RobotStage })));

/** Préchauffe le module 3D (à appeler à la première intention d'ouverture : survol, focus…). */
export function preloadAssistantRobot(): void {
  void import('./RobotStage.js');
}

/** Scène 3D du robot assistant, chargée à la demande. Mêmes props que `RobotStage`. */
export function AssistantRobotScene(props: RobotStageProps) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="Chargement du robot"
          style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div className="w-10 h-10 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RobotStage {...props} />
    </Suspense>
  );
}

export default AssistantRobotScene;
