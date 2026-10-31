import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  PMREMGenerator,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RobotController, type AssistantState, type ControllerOptions } from './controller.js';
import type { RobotTheme } from './materials.js';
import { Robot } from './Robot.js';

/** Éclairage « studio » : reflets doux sur le vinyle sans fichier HDR à télécharger. */
function StudioEnvironment({ intensity = 0.9 }: { intensity?: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env: Texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}

export type RobotFraming = 'full' | 'bust' | 'close';

const FRAMING: Record<RobotFraming, { pos: [number, number, number]; target: [number, number, number]; fov: number }> = {
  full: { pos: [0, 0.95, 4.0], target: [0, 0.78, 0], fov: 30 },
  bust: { pos: [0, 1.1, 2.3], target: [0, 1.0, 0], fov: 30 },
  close: { pos: [0, 1.3, 1.45], target: [0, 1.27, 0], fov: 32 },
};

function CameraRig({ framing }: { framing: RobotFraming }) {
  const { camera } = useThree();
  useEffect(() => {
    const f = FRAMING[framing];
    camera.position.set(...f.pos);
    camera.lookAt(...f.target);
    if ('fov' in camera) {
      (camera as { fov: number }).fov = f.fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, framing]);
  return null;
}

export interface RobotStageProps {
  /** Contrôleur à piloter. Créé automatiquement si absent. */
  controller?: RobotController;
  controllerOptions?: ControllerOptions;
  /** État de l'assistant : pilote le comportement automatique (écoute, réflexion, parole…). */
  state?: AssistantState;
  /** Volume de la voix, 0..1, pour animer la tête quand l'assistant parle. */
  speechLevel?: number;
  theme?: RobotTheme;
  framing?: RobotFraming;
  /** La tête et le regard suivent le pointeur de la souris. Défaut `true`. */
  followPointer?: boolean;
  /** Suspend le rendu (onglet masqué, overlay fermé). */
  paused?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Éléments 3D supplémentaires, rendus dans la même scène (accessoires, repères, sol personnalisé…). */
  children?: React.ReactNode;
}

function PointerGaze({ controller }: { controller: RobotController }) {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      // x écran vers la droite = +x du robot vu de face → le robot « regarde » vers ce côté.
      controller.setGaze({ yaw: -nx * 0.9, pitch: -ny * 0.45 });
    };
    const onLeave = (e: MouseEvent) => {
      if (e.relatedTarget === null) controller.setGaze(null);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseout', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseout', onLeave);
      controller.setGaze(null);
    };
  }, [controller]);
  return null;
}

/**
 * Scène 3D prête à l'emploi : canvas transparent, éclairage studio, ombre au sol, caméra cadrée.
 * Le robot s'anime tout seul selon `state` ; pour des gestes précis, passer un `controller`
 * (`controller.play('wave')`, `controller.walkTo(1, 0)`, `controller.pointAt('L', [...])`…).
 */
export function RobotStage({
  controller: external,
  controllerOptions,
  state = 'idle',
  speechLevel = 0,
  theme,
  framing = 'full',
  followPointer = true,
  paused = false,
  className,
  style,
  children,
}: RobotStageProps) {
  const own = useRef<RobotController | null>(null);
  const controller = useMemo(() => {
    if (external) return external;
    if (!own.current) own.current = new RobotController(controllerOptions);
    return own.current;
  }, [external]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    controller.setState(state);
  }, [controller, state]);
  useEffect(() => {
    controller.speechLevel = speechLevel;
  }, [controller, speechLevel]);

  const f = FRAMING[framing];
  return (
    <div className={className} style={{ width: '100%', height: '100%', ...style }} data-slot="robot-stage">
      <Canvas
        shadows={{ type: PCFSoftShadowMap }}
        dpr={[1, 2]}
        frameloop={paused ? 'never' : 'always'}
        camera={{ position: f.pos, fov: f.fov, near: 0.1, far: 50 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.85, outputColorSpace: SRGBColorSpace }}
        style={{ background: 'transparent' }}
      >
        <CameraRig framing={framing} />
        <StudioEnvironment />
        <hemisphereLight args={['#ffffff', '#7d838f', 0.22]} />
        <directionalLight
          position={[-1.6, 5, 2.6]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-2.5}
          shadow-camera-right={2.5}
          shadow-camera-top={3}
          shadow-camera-bottom={-1}
          shadow-camera-near={0.5}
          shadow-camera-far={12}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
        />
        <directionalLight position={[3, 1.5, 1.5]} intensity={0.45} color="#dfe8ff" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <shadowMaterial opacity={0.28} />
        </mesh>
        <Robot controller={controller} theme={theme} />
        {followPointer ? <PointerGaze controller={controller} /> : null}
        {children}
      </Canvas>
    </div>
  );
}

export default RobotStage;
