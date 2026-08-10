// ============================================================================
//  EGEN THEME ENGINE — Orchestrateur principal
// ============================================================================

import { loadHighestPriorityTheme, loadHighestPriorityThemeIfChanged } from './loader';
import { flattenToCssVars } from './flatten';
import {
  injectCssVarsToDocument,
  removeCssVarsFromDocument,
  injectScopedCssVars,
  removeScopedCssVars,
  applyModeAttribute,
} from './inject';
import { mergeBySortedPriority } from './deepMerge';
import type {
  ThemeEngineOptions,
  ThemeEngineState,
  LoadedTheme,
  ThemeMode,
  ThemeSchema,
  AppThemeOverride,
  FlattenResult,
} from './types';

/**
 * Clé de scope interne réservée pour les surcharges GLOBALES (non scopées à
 * une app précise — ex: thème d'un tenant, qui doit s'appliquer à toute la
 * page). Réutilise exactement le même mécanisme de fusion par priorité que
 * les surcharges par app (`overrides` Map, `mergeBySortedPriority`), mais
 * s'injecte sur `targetSelector` (`:root` par défaut) au lieu d'un sélecteur
 * `[data-egen-app="..."]` — donc elle s'applique immédiatement, sans qu'
 * aucun élément du DOM n'ait besoin de porter un attribut particulier.
 *
 * Ce préfixe est délibérément improbable pour ne jamais entrer en collision
 * avec un vrai nom de scope d'app choisi par un⋅e développeur⋅se.
 */
const GLOBAL_OVERRIDE_SCOPE = '__egen_global_override__';

const DEFAULT_OPTIONS: Required<
  Pick<
    ThemeEngineOptions,
    | 'cssVarPrefix'
    | 'separator'
    | 'ignoreRootKeys'
    | 'pollIntervalMs'
    | 'targetSelector'
    | 'defaultMode'
    | 'modeStorageKey'
  >
> = {
  cssVarPrefix: '',
  separator: '-',
  ignoreRootKeys: ['priority', 'meta'],
  pollIntervalMs: 0,
  targetSelector: ':root',
  defaultMode: 'dark',
  modeStorageKey: 'egen-theme-mode',
};

/**
 * Thème de secours minimal, embarqué directement dans le moteur (aucune
 * requête réseau requise). Appliqué UNIQUEMENT si tous les `themeUrls`
 * fournis échouent à charger/valider — pour que l'application reste
 * exploitable (lisible, navigable) plutôt que totalement non stylée.
 *
 * Volontairement minimal : il ne couvre que les tokens essentiels à la
 * lisibilité de base. Ce n'est pas un "vrai" thème de présentation — c'est
 * un filet de sécurité, pas une dépendance cachée comme l'était l'ancien
 * SCSS statique dupliqué.
 */
const EMBEDDED_FALLBACK_THEME: ThemeSchema = {
  priority: -1,
  meta: { name: 'Fallback intégré (egen/esm-theme)' },
  colors: {
    primary: {
      '50': '#eef2ff', '100': '#e0e7ff', '200': '#c7d2fe', '300': '#a5b4fc', '400': '#818cf8',
      '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca', '800': '#3730a3', '900': '#312e81', '950': '#1e1b4b',
    },
    surface: {
      light: { background: '#ffffff', foreground: '#0f172a' },
      dark: { background: '#0f172a', foreground: '#f1f5f9' },
    },
    border: {
      light: { default: '#cbd5e1' },
      dark: { default: '#334155' },
    },
  },
  borderRadius: { md: '0.5rem', xl: '1rem' },
  transitions: { default: 'all 200ms ease' },
};

/**
 * ThemeEngine — Moteur de thème dynamique EGEN
 *
 * Charge des fichiers JSON de thème par URL, sélectionne le plus prioritaire,
 * résout le mode clair/sombre, aplatit ses tokens en variables CSS et les
 * injecte dans le DOM. Supporte le hot-reload par polling ainsi que des
 * surcharges scopées par application, avec fusion par priorité.
 *
 * @example
 * ```ts
 * const engine = new ThemeEngine({
 *   themeUrls: ['/themes/theme.default.json', '/themes/tenant.json'],
 *   pollIntervalMs: 3000, // hot-reload toutes les 3s
 * });
 * await engine.apply();
 *
 * // Une app peut surcharger son propre scope, sans toucher au reste :
 * engine.applyAppOverride('mon-app', { colors: { primary: { '500': '#16a34a' } } });
 * ```
 */
export class ThemeEngine {
  private readonly options: ThemeEngineOptions & typeof DEFAULT_OPTIONS;
  private state: ThemeEngineState = {
    status: 'idle',
    activeTheme: null,
    mode: 'dark',
    cssVarsCount: 0,
    error: null,
    lastApplied: null,
    activeOverrideScopes: [],
    usingFallback: false,
  };

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  /** Hash de contenu par URL, utilisé par le polling pour éviter de re-flatten/ré-injecter si rien n'a changé. */
  private lastPollHashes = new Map<string, string>();

  private readonly listeners = new Set<(state: ThemeEngineState) => void>();

  /** Surcharges enregistrées par scope (ex: nom d'app) → liste ordonnée par priorité */
  private readonly overrides = new Map<string, AppThemeOverride[]>();

  constructor(options: ThemeEngineOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.state.mode = this.resolveInitialMode();
  }

  // --------------------------------------------------------------------------
  // API publique — cycle de vie du thème global
  // --------------------------------------------------------------------------

  /**
   * Charge et applique le thème le plus prioritaire.
   * Retourne les variables CSS générées (groupées par base/light/dark).
   *
   * Si AUCUN `themeUrls` ne charge/valide avec succès, le moteur n'échoue
   * pas silencieusement (et ne laisse pas l'app sans aucun style) : il
   * applique un thème de secours minimal embarqué (`EMBEDDED_FALLBACK_THEME`)
   * et place `status: 'error'` + `usingFallback: true` dans son état, pour
   * que l'app puisse afficher un avertissement si elle le souhaite.
   */
  async apply(): Promise<FlattenResult> {
    this.setState({ status: 'loading', error: null });

    try {
      const loaded = await loadHighestPriorityTheme(this.options.themeUrls);

      if (!loaded) {
        throw new Error('Aucun thème valide trouvé parmi les URLs fournies.');
      }

      const cssVars = this.processTheme(loaded);

      applyModeAttribute(this.state.mode);

      this.setState({
        status: 'applied',
        activeTheme: loaded,
        cssVarsCount:
          Object.keys(cssVars.base).length + Object.keys(cssVars.light).length + Object.keys(cssVars.dark).length,
        lastApplied: Date.now(),
        error: null,
        usingFallback: false,
      });

      this.options.onApplied?.(loaded, cssVars);

      // Ré-appliquer les surcharges existantes par-dessus le nouveau thème global
      for (const scope of this.overrides.keys()) {
        this.recomputeOverride(scope);
      }

      if (this.options.pollIntervalMs > 0 && !this.pollTimer) {
        this.startPolling();
      }

      return cssVars;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.options.onError?.(err instanceof Error ? err : new Error(message));
      console.error(
        "[egen/esm-theme] ❌ Erreur lors de l'application du thème — repli sur le thème de secours intégré:",
        message,
      );

      // Filet de sécurité : on applique tout de même un thème minimal pour
      // que l'app reste lisible/navigable plutôt que totalement non stylée.
      const fallback: LoadedTheme = { url: '(embedded-fallback)', priority: -1, schema: EMBEDDED_FALLBACK_THEME };
      const cssVars = this.processTheme(fallback);
      applyModeAttribute(this.state.mode);

      this.setState({
        status: 'error',
        activeTheme: fallback,
        cssVarsCount:
          Object.keys(cssVars.base).length + Object.keys(cssVars.light).length + Object.keys(cssVars.dark).length,
        lastApplied: Date.now(),
        error: message,
        usingFallback: true,
      });

      return cssVars;
    }
  }

  startPolling(): void {
    if (this.pollTimer) return;

    const interval = this.options.pollIntervalMs;
    if (!interval || interval <= 0) return;

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[egen/esm-theme] 🔄 Hot-reload activé (polling toutes les ${interval}ms)`);
    }

    this.pollTimer = setInterval(async () => {
      try {
        // Variante "if-changed" : compare un hash léger du contenu brut de
        // chaque URL à la dernière exécution AVANT tout parsing/flatten —
        // si rien n'a changé, on sort immédiatement sans toucher au DOM ni
        // notifier les abonnés (évite un coût CPU/réseau inutile à chaque
        // tick quand le thème est stable, ce qui est le cas la majorité du temps).
        const result = await loadHighestPriorityThemeIfChanged(this.options.themeUrls, this.lastPollHashes);
        if (!result.changed) return;

        this.lastPollHashes = result.hashes;
        const loaded = result.theme;

        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('[egen/esm-theme] 🔥 Changement de thème détecté — rechargement à chaud');
        }
        const cssVars = this.processTheme(loaded);
        this.setState({
          status: 'applied',
          activeTheme: loaded,
          cssVarsCount:
            Object.keys(cssVars.base).length + Object.keys(cssVars.light).length + Object.keys(cssVars.dark).length,
          lastApplied: Date.now(),
          error: null,
          usingFallback: false,
        });
        this.options.onApplied?.(loaded, cssVars);
        for (const scope of this.overrides.keys()) {
          this.recomputeOverride(scope);
        }
      } catch (err) {
        // Une égalité de priorité levée en dev (cf. loader.ts) ou toute
        // autre erreur ne doit pas arrêter le polling — on log et on
        // réessaiera au prochain tick.
        console.warn('[egen/esm-theme] ⚠️  Erreur pendant le polling de hot-reload:', err);
      }
    }, interval);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('[egen/esm-theme] ⏹  Hot-reload désactivé');
      }
    }
  }

  /**
   * Retire toutes les variables CSS (globales + surcharges) du DOM et remet
   * le moteur à zéro.
   */
  destroy(): void {
    this.stopPolling();
    removeCssVarsFromDocument();
    for (const scope of this.overrides.keys()) {
      removeScopedCssVars(scope);
    }
    this.overrides.clear();
    this.lastPollHashes = new Map();
    this.setState({
      status: 'idle',
      activeTheme: null,
      cssVarsCount: 0,
      error: null,
      lastApplied: null,
      activeOverrideScopes: [],
      usingFallback: false,
    });
    this.listeners.clear();
  }

  getState(): ThemeEngineState {
    return { ...this.state, activeOverrideScopes: [...this.state.activeOverrideScopes] };
  }

  subscribe(listener: (state: ThemeEngineState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  // --------------------------------------------------------------------------
  // API publique — mode clair / sombre
  // --------------------------------------------------------------------------

  getMode(): ThemeMode {
    return this.state.mode;
  }

  /**
   * Change le mode actif (clair/sombre). Persisté en localStorage si
   * `modeStorageKey` n'est pas `null`. Aucune ré-injection de variables
   * n'est nécessaire : les deux jeux de variables (light + dark) sont déjà
   * présents dans le DOM, seul l'attribut `data-theme` change — donc c'est
   * instantané et ne provoque pas de flash.
   */
  setMode(mode: ThemeMode): void {
    if (mode === this.state.mode) return;
    this.state.mode = mode;
    applyModeAttribute(mode);
    if (this.options.modeStorageKey && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(this.options.modeStorageKey, mode);
      } catch {
        // localStorage indisponible (mode privé, quota...) — non bloquant
      }
    }
    this.options.onModeChanged?.(mode);
    this.setState({});
  }

  toggleMode(): void {
    this.setMode(this.state.mode === 'dark' ? 'light' : 'dark');
  }

  // --------------------------------------------------------------------------
  // API publique — surcharges par application, avec priorité
  // --------------------------------------------------------------------------

  /**
   * Enregistre (ou met à jour) une surcharge de thème scopée à une
   * application. Le scope sert à la fois de clé d'enregistrement et de
   * sélecteur CSS d'injection : `[data-egen-app="<scope>"]`.
   *
   * Plusieurs surcharges peuvent coexister sur le même scope (ex: une
   * surcharge "tenant" à priority=5 et une surcharge "préférence
   * utilisateur" à priority=10) — elles sont fusionnées en profondeur dans
   * l'ordre des priorités, la plus haute gagnant clé par clé.
   *
   * @param scope Nom du scope (en général le nom de l'app, ex: "egen-academique")
   * @param schema Schéma de thème partiel (deep partial — ne déclarer que ce qu'on surcharge)
   * @param options.id Identifiant de cette surcharge précise au sein du scope (par défaut "default")
   * @param options.priority Priorité de fusion (par défaut 0)
   */
  applyAppOverride(
    scope: string,
    schema: Partial<ThemeSchema>,
    options: { id?: string; priority?: number } = {},
  ): void {
    const id = options.id ?? 'default';
    const priority = options.priority ?? 0;

    const existing = this.overrides.get(scope) ?? [];
    const next = [...existing.filter((o) => o.id !== id), { id, priority, schema }];
    this.overrides.set(scope, next);

    this.recomputeOverride(scope);
  }

  /**
   * Retire une surcharge précise d'un scope (ou tout le scope si `id` est omis).
   */
  removeAppOverride(scope: string, id?: string): void {
    if (id === undefined) {
      this.overrides.delete(scope);
      removeScopedCssVars(scope);
    } else {
      const existing = this.overrides.get(scope);
      if (!existing) return;
      const next = existing.filter((o) => o.id !== id);
      if (next.length === 0) {
        this.overrides.delete(scope);
        removeScopedCssVars(scope);
      } else {
        this.overrides.set(scope, next);
        this.recomputeOverride(scope);
      }
    }

    this.setState({ activeOverrideScopes: this.publicOverrideScopes() });
  }

  /** Liste les surcharges actuellement enregistrées pour un scope (debug/inspection). */
  getAppOverrides(scope: string): AppThemeOverride[] {
    return [...(this.overrides.get(scope) ?? [])];
  }

  // --------------------------------------------------------------------------
  // API publique — surcharges GLOBALES (ex: thème tenant), sans scope DOM
  // --------------------------------------------------------------------------

  /**
   * Enregistre (ou met à jour) une surcharge de thème GLOBALE, appliquée
   * directement sur `targetSelector` (`:root` par défaut) — donc visible sur
   * toute la page, sans qu'aucun conteneur n'ait besoin de porter
   * `data-egen-app`. C'est le mécanisme à utiliser pour un thème de tenant,
   * une préférence utilisateur globale, etc. Pour une surcharge limitée à
   * une seule application microfrontend, utiliser `applyAppOverride` avec
   * `data-egen-app="<scope>"` posé sur son conteneur racine à la place.
   *
   * Fusion par priorité identique à `applyAppOverride` : plusieurs surcharges
   * globales peuvent coexister (ex: tenant à priority=10, thème distant du
   * tenant à priority=9) et sont fusionnées en profondeur, la plus haute
   * priorité gagnant clé par clé.
   */
  applyGlobalOverride(schema: Partial<ThemeSchema>, options: { id?: string; priority?: number } = {}): void {
    this.applyAppOverride(GLOBAL_OVERRIDE_SCOPE, schema, options);
  }

  /** Retire une surcharge globale précise (ou toutes si `id` est omis). */
  removeGlobalOverride(id?: string): void {
    this.removeAppOverride(GLOBAL_OVERRIDE_SCOPE, id);
  }

  /** Liste les surcharges globales actuellement enregistrées (debug/inspection). */
  getGlobalOverrides(): AppThemeOverride[] {
    return this.getAppOverrides(GLOBAL_OVERRIDE_SCOPE);
  }

  // --------------------------------------------------------------------------
  // Méthodes internes
  // --------------------------------------------------------------------------

  private resolveInitialMode(): ThemeMode {
    if (typeof document !== 'undefined') {
      const existingAttr = document.documentElement.getAttribute('data-theme');
      if (existingAttr === 'light' || existingAttr === 'dark') return existingAttr;
    }

    if (this.options.modeStorageKey !== null && typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(this.options.modeStorageKey ?? DEFAULT_OPTIONS.modeStorageKey);
        if (stored === 'light' || stored === 'dark') return stored;
      } catch {
        // ignore
      }
    }

    // NOTE : on ne se cale plus sur `prefers-color-scheme` du système. Le thème EGEN
    // (panels, topbar, etc.) n'expose des tokens que pour `panel.dark.*` — un système
    // en préférence claire résolvait silencieusement en 'light' et laissait tous les
    // `var(--panel-*)` non définis (donc le style Carbon par défaut, non thémé, restait
    // affiché). Le mode initial est donc désormais toujours `defaultMode` ('dark'),
    // sauf attribut `data-theme` déjà posé ou choix explicite persisté par l'utilisateur.
    return this.options.defaultMode;
  }

  private processTheme(loaded: LoadedTheme): FlattenResult {
    const cssVars = flattenToCssVars(loaded.schema as Record<string, unknown>, {
      prefix: this.options.cssVarPrefix,
      separator: this.options.separator,
      ignoreRootKeys: this.options.ignoreRootKeys,
    });

    injectCssVarsToDocument(cssVars, this.options.targetSelector);

    return cssVars;
  }

  /**
   * Recalcule la surcharge CSS effective d'un scope : fusion par priorité
   * croissante de toutes les surcharges enregistrées sur ce scope, puis
   * flatten + injection scopée.
   */
  private recomputeOverride(scope: string): void {
    const entries = this.overrides.get(scope);
    if (!entries || entries.length === 0) {
      removeScopedCssVars(scope);
      this.setState({ activeOverrideScopes: this.publicOverrideScopes() });
      return;
    }

    const merged = mergeBySortedPriority<Partial<ThemeSchema>>({}, entries);

    const cssVars = flattenToCssVars(merged as Record<string, unknown>, {
      prefix: this.options.cssVarPrefix,
      separator: this.options.separator,
      ignoreRootKeys: this.options.ignoreRootKeys,
    });

    // La surcharge globale (tenant, etc.) s'injecte directement sur
    // `targetSelector` (`:root`) — toutes les autres restent scopées à
    // `[data-egen-app="<scope>"]`, nécessitant que l'app pose cet attribut
    // sur son conteneur racine pour que la surcharge s'applique.
    const selector = scope === GLOBAL_OVERRIDE_SCOPE ? this.options.targetSelector : `[data-egen-app='${scope}']`;

    injectScopedCssVars(selector, cssVars, scope);

    this.setState({ activeOverrideScopes: this.publicOverrideScopes() });
  }

  /** Scopes actifs, hors scope interne réservé aux surcharges globales (détail d'implémentation). */
  private publicOverrideScopes(): string[] {
    return [...this.overrides.keys()].filter((s) => s !== GLOBAL_OVERRIDE_SCOPE);
  }

  private setState(partial: Partial<ThemeEngineState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }
}
