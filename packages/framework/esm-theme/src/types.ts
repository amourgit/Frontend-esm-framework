// ============================================================================
//  EGEN THEME ENGINE — Types publics
// ============================================================================
//
//  IMPORTANT — Vocabulaire 100% générique :
//  Aucune clé de ce fichier ne doit nommer un style visuel précis
//  (ex: "glass", "neumorphism", "material"...). Le NOM des clés décrit la
//  FONCTION du token (surface d'un panneau, échelle de couleur, etc.), jamais
//  son apparence. C'est la VALEUR posée dans le JSON de thème qui décide du
//  style (un blur fort + fond translucide => glassmorphism, un blur nul +
//  fond opaque => style plat, etc.). Ça permet à n'importe quel thème
//  (glass, flat, material, brutaliste...) d'utiliser exactement le même
//  schéma, sans jamais devoir "mentir" sur un nom de clé.
// ============================================================================

/** Mode d'affichage clair/sombre résolu au runtime */
export type ThemeMode = 'light' | 'dark';

/** Structure d'une palette de couleurs (50→950) */
export interface ColorScale {
  '50': string;
  '100': string;
  '200': string;
  '300': string;
  '400': string;
  '500': string;
  '600': string;
  '700': string;
  '800': string;
  '900': string;
  '950': string;
}

/** Valeurs de surface (déclinées en light/dark dans le JSON, résolues au runtime) */
export interface SurfaceTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  sidebar: string;
  sidebarForeground: string;
  header: string;
  headerForeground: string;
  overlay: string;
  skeleton: string;
  destructive: string;
  destructiveForeground: string;
  /** Fond translucide générique utilisé par les panneaux (cf. PanelLayer) */
  translucent: string;
  translucentBorder: string;
  translucentHover: string;
}

/** Tokens de bordure */
export interface BorderTokens {
  default: string;
  input: string;
  ring: string;
  focus: string;
  divider: string;
  translucent: string;
}

/**
 * Couche de style d'un "panneau" — c'est-à-dire toute surface de composant
 * (carte, modale, menu, info-bulle...). Les noms de propriétés décrivent des
 * propriétés CSS génériques, pas un style visuel : un thème "flat" peut très
 * bien poser `backdropFilter: "none"`.
 */
export interface PanelLayer {
  background: string;
  backdropFilter: string;
  border: string;
  boxShadow: string;
}

/**
 * Ensemble complet des couches "panneau" pour les composants de base.
 * Décliné en light/dark dans le JSON, résolu dynamiquement au runtime.
 *
 * Tailles génériques (xs→xl) pour tout conteneur libre, plus une entrée par
 * composant de base courant dans une UI applicative.
 */
export interface PanelTokenSet {
  xs: PanelLayer;
  sm: PanelLayer;
  md: PanelLayer;
  lg: PanelLayer;
  xl: PanelLayer;
  sidebar: PanelLayer;
  header: PanelLayer;
  modal: PanelLayer;
  card: PanelLayer;
  dropdown: PanelLayer;
  toast: PanelLayer;
  tooltip: PanelLayer;
  popover: PanelLayer;
  input: PanelLayer;
  overlay: PanelLayer;
}

/** Schéma complet d'un fichier thème JSON */
export interface ThemeSchema {
  /** Priorité — seul le fichier avec la valeur la plus haute est appliqué au global */
  priority: number;

  meta?: {
    name?: string;
    version?: string;
    author?: string;
    description?: string;
    /** Identifiant du tenant propriétaire de ce thème (filtrage côté serveur / audit) — purement informatif, jamais lu par le moteur. */
    tenantId?: string;
    createdAt?: string;
    updatedAt?: string;
  };

  colors?: {
    primary?: ColorScale;
    secondary?: ColorScale;
    neutral?: ColorScale;
    success?: ColorScale;
    warning?: ColorScale;
    error?: ColorScale;
    info?: ColorScale;
    /** Couleur de texte/icône lisible sur un fond `colors.primary.*` (ex: boutons pleins). */
    onPrimary?: string;
    /** Couleur de texte/icône lisible sur un fond `colors.secondary.*`. */
    onSecondary?: string;
    surface?: {
      light?: Partial<SurfaceTokens>;
      dark?: Partial<SurfaceTokens>;
    };
    border?: {
      light?: Partial<BorderTokens>;
      dark?: Partial<BorderTokens>;
    };
  };

  /**
   * Styles de panneaux génériques (anciennement nommé "glass" — renommé
   * pour ne plus présupposer un style visuel particulier).
   */
  panel?: {
    light?: Partial<PanelTokenSet>;
    dark?: Partial<PanelTokenSet>;
  };

  typography?: Record<string, unknown>;
  spacing?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  borderRadius?: Record<string, unknown>;
  shadows?: Record<string, unknown>;
  animation?: Record<string, unknown>;
  transitions?: Record<string, unknown>;
  effects?: Record<string, unknown>;
  zIndex?: Record<string, unknown>;
  icons?: Record<string, unknown>;
  components?: Record<string, unknown>;

  [key: string]: unknown;
}

/** Un fichier thème chargé + ses métadonnées de chargement */
export interface LoadedTheme {
  url: string;
  priority: number;
  schema: ThemeSchema;
}

/**
 * Résultat d'un flatten : les variables sont réparties en 3 groupes.
 * - `base`    : valeurs indépendantes du mode (ex: rayons, transitions, z-index)
 * - `light`   : valeurs actives uniquement quand le mode clair est résolu
 * - `dark`    : valeurs actives uniquement quand le mode sombre est résolu
 *
 * Détection automatique : tout nœud JSON dont les seules clés sont "light"
 * et/ou "dark" est traité comme une branche thématisable — son contenu est
 * réparti dans les bonnes catégories SANS que "light"/"dark" n'apparaisse
 * dans le nom de variable final (c'est le sélecteur CSS qui résout le mode).
 */
export interface FlattenResult {
  base: Record<string, string>;
  light: Record<string, string>;
  dark: Record<string, string>;
}

/** Options de configuration du ThemeEngine */
export interface ThemeEngineOptions {
  /**
   * Liste de URLs (absolues ou relatives) pointant vers des fichiers JSON de thème.
   * Le moteur les charge tous, compare les priorités, et applique le gagnant.
   */
  themeUrls: string[];

  /**
   * Préfixe des variables CSS générées. "" -> "--colors-primary-500"
   * @default ""
   */
  cssVarPrefix?: string;

  /**
   * Séparateur entre segments de clés imbriquées.
   * @default "-"
   */
  separator?: string;

  /**
   * Clés racines ignorées lors du flatten (ne génèrent pas de variables CSS).
   * @default ["priority", "meta"]
   */
  ignoreRootKeys?: string[];

  /**
   * Active le hot-reload via polling (en ms). 0 = désactivé.
   * @default 0
   */
  pollIntervalMs?: number;

  /**
   * Sélecteur CSS cible pour l'injection des variables "base" (indépendantes du mode).
   * @default ":root"
   */
  targetSelector?: string;

  /**
   * Mode initial si aucune préférence n'est trouvée (ni `localStorage`,
   * ni attribut `data-theme` déjà posé sur `<html>`, ni `prefers-color-scheme`).
   * @default "dark"
   */
  defaultMode?: ThemeMode;

  /**
   * Clé localStorage utilisée pour persister le mode choisi par l'utilisateur.
   * `null` désactive la persistance.
   * @default "egen-theme-mode"
   */
  modeStorageKey?: string | null;

  /**
   * Callback appelé après chaque application réussie d'un thème.
   */
  onApplied?: (theme: LoadedTheme, cssVars: FlattenResult) => void;

  /**
   * Callback appelé en cas d'erreur de chargement.
   */
  onError?: (err: Error) => void;

  /**
   * Callback appelé à chaque changement de mode (clair/sombre).
   */
  onModeChanged?: (mode: ThemeMode) => void;
}

/** État courant du moteur (observable via l'API publique) */
export interface ThemeEngineState {
  status: 'idle' | 'loading' | 'applied' | 'error';
  activeTheme: LoadedTheme | null;
  mode: ThemeMode;
  cssVarsCount: number;
  error: string | null;
  lastApplied: number | null;
  /** Liste des scopes de surcharge app actuellement actifs (cf. AppThemeOverride) */
  activeOverrideScopes: string[];
  /**
   * `true` si AUCUN thème fourni n'a pu charger/valider et que le moteur
   * applique en repli le thème de secours minimal embarqué
   * (`EMBEDDED_FALLBACK_THEME`). À surveiller en prod (cf. `onError`).
   */
  usingFallback: boolean;
}

/**
 * Surcharge de thème scopée à une application/feature précise.
 *
 * Le schéma fourni n'a besoin de déclarer QUE les clés qu'elle souhaite
 * modifier (deep partial) — toute clé non déclarée continue d'hériter de la
 * cascade CSS standard depuis le thème global (`:root` / `[data-theme]`).
 *
 * Plusieurs surcharges peuvent être enregistrées sur le même scope : elles
 * sont fusionnées par ordre de `priority` croissante (la plus haute gagne
 * clé par clé, en profondeur — pas de "winner-take-all" global).
 */
export interface AppThemeOverride {
  /** Identifiant unique de la surcharge au sein d'un même scope */
  id: string;
  /** Priorité de fusion — la plus haute valeur gagne en cas de conflit de clé */
  priority: number;
  /** Schéma de thème partiel (mêmes règles que ThemeSchema, tout est optionnel) */
  schema: Partial<ThemeSchema>;
}
