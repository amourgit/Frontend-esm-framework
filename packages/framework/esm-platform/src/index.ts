// ============================================================================
//  @egen-civitas/esm-platform — Point d'entrée public
// ============================================================================
//  Capacités de plateforme (web / Android / iOS) pour les apps EGEN.
//  Ce package ne contient AUCUN code natif et ne dépend d'aucune bibliothèque d'enveloppe (Capacitor…) :
//  il définit des contrats et parle à un Host par un protocole versionné.
//  Voir docs/EGEN-FRAMEWORK-DEV.md (chantier C).
// ============================================================================
export * from './types.js';
export * from './errors.js';
export * from './detect.js';
export { getPlatform, registerPlatformCapabilities } from './platform.js';
export { getHostInfo } from './native.js';
export * from './bridge/index.js';
