import type { CapabilityName, EgenTarget } from '@egen-civitas/esm-globals';

export type { CapabilityName };

/** Environnement d'exécution du SPA. Alias de {@link EgenTarget}. */
export type PlatformEnvironment = EgenTarget;

export type Unsubscribe = () => void;

// ── Capacités v1 (contrat — voir docs/EGEN-FRAMEWORK-DEV.md, annexe 2) ────────────────────────

/** Session : le jeton vit dans le Host (Keychain/Keystore), jamais dans le WebView. */
export interface SessionCapability {
  /** Valeur de l'en-tête `Authorization` (ex. `"Bearer …"`), ou `null` s'il n'y a pas de session. */
  getAuthorization(): Promise<string | null>;
  setTokens(tokens: { access: string; refresh?: string; expiresAt?: number }): Promise<void>;
  /** `true` si un nouveau jeton a été obtenu. */
  refresh(): Promise<boolean>;
  clear(): Promise<void>;
}

/** Coffre sécurisé natif. Valeurs `string` uniquement (aucune sérialisation implicite). */
export interface SecureStorageCapability {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface OpenExternalCapability {
  /** Ouvre une URL hors de l'app. Schémas autorisés : `https:`, `mailto:`, `tel:`. */
  open(url: string): Promise<void>;
}

export interface LifecycleCapability {
  onResume(callback: () => void): Unsubscribe;
  onPause(callback: () => void): Unsubscribe;
}

export type PermissionName = 'camera' | 'microphone' | 'notifications' | 'files';

export interface PermissionsCapability {
  check(name: PermissionName): Promise<'granted' | 'denied' | 'prompt'>;
  request(name: PermissionName): Promise<'granted' | 'denied'>;
}

/** Référence à un fichier géré par le Host : jamais de binaire inline dans le pont. */
export interface FileHandle {
  id: string;
  name: string;
  size: number;
  mime: string;
}

export interface FilesCapability {
  select(options?: { multiple?: boolean; accept?: string[] }): Promise<FileHandle[]>;
  download(url: string, filename: string): Promise<void>;
}

export interface CameraCapability {
  capture(options?: { facing?: 'front' | 'back' }): Promise<FileHandle>;
}

export interface PushCapability {
  register(): Promise<{ token: string }>;
  onMessage(callback: (message: unknown) => void): Unsubscribe;
}

export interface BiometricCapability {
  isAvailable(): Promise<boolean>;
  /** Déverrouillage LOCAL. Ce n'est pas une authentification serveur. */
  authenticate(reason: string): Promise<boolean>;
}

/**
 * Forme (interface TypeScript) de chaque capacité, indexée par son nom. Les 9 capacités de la v1 y sont déclarées ;
 * une nouvelle capacité s'y ajoute par FUSION DE DÉCLARATION depuis son propre fichier (procédure « ajouter une
 * capacité » du README), sans modifier celui-ci :
 *
 * ```ts
 * declare module './types.js' {
 *   interface CapabilityInterfaces {
 *     maCapacite: MaCapaciteCapability;
 *   }
 * }
 * ```
 *
 * Le nom doit aussi être déclaré dans `EgenCapabilityExtensions` (`@egen-civitas/esm-globals`) pour être un
 * `CapabilityName` valide.
 */
export interface CapabilityInterfaces {
  session: SessionCapability;
  secureStorage: SecureStorageCapability;
  openExternal: OpenExternalCapability;
  lifecycle: LifecycleCapability;
  permissions: PermissionsCapability;
  files: FilesCapability;
  camera: CameraCapability;
  push: PushCapability;
  biometric: BiometricCapability;
}

/** Ce qui est commun à toute plateforme, indépendamment des capacités. */
export interface PlatformCore {
  readonly environment: PlatformEnvironment;
  /** Résolue quand le handshake avec le Host est terminé (immédiatement en Web). */
  readonly ready: Promise<void>;
  has(capability: CapabilityName): boolean;
}

/**
 * Point d'accès unique des apps aux capacités de plateforme.
 * Une capacité indisponible (`has()` faux) existe toujours comme objet : ses méthodes rejettent `UNAVAILABLE`.
 */
export type Platform = PlatformCore & { readonly [K in keyof CapabilityInterfaces]: CapabilityInterfaces[K] };
