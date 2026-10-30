export * from './assistant-modes.js';
export { LiveOrb, createLiveOrb } from './live-orb.component.js';
export type { LiveOrbProps, LiveOrbOptions, LiveOrbInstance, LiveOrbVariant } from './live-orb.component.js';
export * from './prompt-input.component.js';
export * from './spline-scene.component.js';
export * from './recursive-erosion/recursive-erosion-background.component.js';
export * from './water-glass-modal.component.js';
export * from './xbox-audio.js';
// Robot 3D (corps complet animé). `three` n'est chargé qu'à l'affichage : seul le contrôleur
// (pur TypeScript, sans WebGL) est exporté directement.
export { AssistantRobotScene, preloadAssistantRobot } from './robot/lazy.js';
export { RobotController } from './robot/controller.js';
export type { AssistantState, ControllerOptions, PlayOptions } from './robot/controller.js';
export { GESTURE_NAMES } from './robot/gestures.js';
export type { GestureName } from './robot/gestures.js';
export type { RobotStageProps, RobotFraming } from './robot/RobotStage.js';
export type { RobotTheme } from './robot/materials.js';
