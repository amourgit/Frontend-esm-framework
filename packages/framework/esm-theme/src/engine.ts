// ============================================================================
//  EGEN THEME ENGINE — orchestrateur au-dessus de TokiForge
//  TokiForge assure : sélection du thème/mode, persistance, abonnements, injection du CSS, génération et échappement.
//  EGEN n'ajoute que ce que TokiForge ne fait pas : charger les sources du déploiement, retenir le thème le plus
//  prioritaire, superposer les surcharges (document-level), les surcharges par application, et l'application persistante.
// ============================================================================
import { ThemeController } from '@tokiforge/core/runtime';
import { ThemeValidationError } from './model/errors.js';
import { mergeByPriority } from './model/merge.js';
import type {
  GlobalOverrideOptions,
  LoadedTheme,
  OverrideOptions,
  ThemeDocument,
  ThemeEngineOptions,
  ThemeEngineState,
  ThemeMode,
  ThemeOverride,
  ThemeVars,
} from './model/types.js';
import { validateThemeOverride } from './model/validate.js';
import { applyModeAttribute, injectScopedCss, removeScopedCss } from './runtime/dom.js';
import { loadIfChanged, loadWinningTheme } from './runtime/loader.js';
import { createOverrideStore, defaultStorage } from './runtime/persistence.js';
import { buildThemeCss, CSS_VAR_PREFIX, compileTheme, toThemeConfig } from './tokiforge/compile.js';

const LOG = '[egen-civitas/esm-theme]';
const SCOPE_RE = /^[A-Za-z0-9_.:-]+$/;

const DEFAULTS = {
  pollIntervalMs: 0,
  targetSelector: ':root',
  defaultMode: 'dark' as ThemeMode,
  modeStorageKey: 'egen-theme-mode' as string | null,
  overridesStorageKey: 'egen-theme-applied' as string | null,
};

const count = (v: ThemeVars) => Object.keys(v.base).length + Object.keys(v.light).length + Object.keys(v.dark).length;
const isMode = (v: unknown): v is ThemeMode => v === 'light' || v === 'dark';

export class ThemeEngine {
  private readonly options: ThemeEngineOptions & typeof DEFAULTS;
  private readonly store: ReturnType<typeof createOverrideStore>;
  private state: ThemeEngineState = {
    status: 'idle',
    activeTheme: null,
    mode: 'dark',
    cssVarsCount: 0,
    error: null,
    lastApplied: null,
    activeOverrideScopes: [],
    activeGlobalOverrides: [],
  };
  private controller: ThemeController | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private pollHashes = new Map<string, string>();
  private readonly listeners = new Set<(s: ThemeEngineState) => void>();
  private readonly appOverrides = new Map<string, ThemeOverride[]>();
  private globalOverrides: ThemeOverride[] = [];
  private rehydrated = false;

  constructor(options: ThemeEngineOptions) {
    this.options = { ...DEFAULTS, ...options };
    this.store = createOverrideStore(options.storage ?? defaultStorage(), this.options.overridesStorageKey);
    this.state.mode = this.resolveInitialMode();
  }

  // --- Thème de base --------------------------------------------------------------------------------------------

  /** Charge les sources, retient le thème le plus prioritaire et l'applique. Ne lève jamais : l'échec est dans l'état. */
  async apply(): Promise<ThemeVars | null> {
    this.setState({ status: 'loading', error: null });
    try {
      const loaded = await loadWinningTheme(this.options.themeUrls, this.options.themeDocuments);
      if (!loaded) throw new Error('Aucun thème valide trouvé parmi les URLs fournies.');
      this.rehydrate();
      const vars = this.render(loaded);
      this.options.onApplied?.(loaded, vars);
      if (this.options.pollIntervalMs > 0 && !this.pollTimer) this.startPolling();
      return vars;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`${LOG} ❌ Thème non appliqué :`, error.message);
      this.setState({ status: 'error', error: error.message });
      this.options.onError?.(error);
      return null;
    }
  }

  startPolling(): void {
    const interval = this.options.pollIntervalMs;
    if (this.pollTimer || !interval || interval <= 0) return;
    this.pollTimer = setInterval(async () => {
      try {
        const result = await loadIfChanged(this.options.themeUrls, this.pollHashes);
        if (!result.changed) return;
        this.pollHashes = result.hashes;
        this.options.onApplied?.(result.theme, this.render(result.theme));
      } catch (err) {
        console.warn(`${LOG} ⚠️  Erreur pendant le polling de hot-reload :`, err);
      }
    }, interval);
  }

  stopPolling(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  destroy(): void {
    this.stopPolling();
    this.controller?.destroy();
    this.controller = null;
    for (const scope of this.appOverrides.keys()) removeScopedCss(scope);
    this.appOverrides.clear();
    this.globalOverrides = [];
    this.pollHashes = new Map();
    this.rehydrated = false;
    this.setState({
      status: 'idle',
      activeTheme: null,
      cssVarsCount: 0,
      error: null,
      lastApplied: null,
      activeOverrideScopes: [],
      activeGlobalOverrides: [],
    });
    this.listeners.clear();
  }

  // --- État -----------------------------------------------------------------------------------------------------

  getState(): ThemeEngineState {
    return {
      ...this.state,
      activeOverrideScopes: [...this.state.activeOverrideScopes],
      activeGlobalOverrides: [...this.state.activeGlobalOverrides],
    };
  }

  subscribe(listener: (state: ThemeEngineState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  // --- Mode (TokiForge ThemeController : sélection, persistance, abonnés) ---------------------------------------------

  getMode(): ThemeMode {
    return this.state.mode;
  }

  setMode(mode: ThemeMode): void {
    if (this.controller) this.controller.setTheme(mode);
    else this.onModeApplied(mode); // avant le premier rendu : mémorisé et appliqué au rendu
  }

  toggleMode(): void {
    this.setMode(this.state.mode === 'dark' ? 'light' : 'dark');
  }

  // --- Surcharges -----------------------------------------------------------------------------------------------

  /** Surcharge limitée à une application (`[data-egen-app="<scope>"]`). Lève `ThemeValidationError` si le document est invalide. */
  applyAppOverride(scope: string, document: Partial<ThemeDocument>, options: OverrideOptions = {}): void {
    if (!SCOPE_RE.test(scope))
      throw new Error(`${LOG} Nom de scope invalide : « ${scope} » (caractères autorisés : A-Z a-z 0-9 _ . : -).`);
    const entry = this.toOverride(document, options);
    this.appOverrides.set(scope, [...(this.appOverrides.get(scope) ?? []).filter((o) => o.id !== entry.id), entry]);
    this.recomputeScope(scope);
  }

  removeAppOverride(scope: string, id?: string): void {
    const existing = this.appOverrides.get(scope);
    if (!existing) return;
    const next = id === undefined ? [] : existing.filter((o) => o.id !== id);
    if (next.length === 0) this.appOverrides.delete(scope);
    else this.appOverrides.set(scope, next);
    this.recomputeScope(scope);
  }

  getAppOverrides(scope: string): ThemeOverride[] {
    return [...(this.appOverrides.get(scope) ?? [])];
  }

  /**
   * Surcharge GLOBALE : fusionnée au document du thème (par priorité) puis compilée par TokiForge — un seul thème effectif.
   * Avec `persist: true`, elle est conservée et **réappliquée au prochain démarrage** (ADR-005).
   */
  applyGlobalOverride(document: Partial<ThemeDocument>, options: GlobalOverrideOptions = {}): void {
    const entry = this.toOverride(document, options);
    this.globalOverrides = [...this.globalOverrides.filter((o) => o.id !== entry.id), entry];
    if (options.persist) this.store.save(entry);
    this.rerender();
  }

  removeGlobalOverride(id?: string): void {
    this.globalOverrides = id === undefined ? [] : this.globalOverrides.filter((o) => o.id !== id);
    this.store.remove(id);
    this.rerender();
  }

  getGlobalOverrides(): ThemeOverride[] {
    return [...this.globalOverrides];
  }

  /** Vrai si une surcharge globale (de cet `id`, ou n'importe laquelle) est active — dérivé de l'état réel du moteur. */
  isGlobalOverrideApplied(id?: string): boolean {
    return id === undefined ? this.globalOverrides.length > 0 : this.globalOverrides.some((o) => o.id === id);
  }

  // --- Interne --------------------------------------------------------------------------------------------------

  private toOverride(document: Partial<ThemeDocument>, options: OverrideOptions): ThemeOverride {
    const verdict = validateThemeOverride(document);
    if (!verdict.valid) throw new ThemeValidationError('Surcharge de thème refusée.', verdict.errors);
    return { id: options.id ?? 'default', priority: options.priority ?? 0, document };
  }

  private resolveInitialMode(): ThemeMode {
    if (typeof document !== 'undefined') {
      const attr = document.documentElement.getAttribute('data-theme');
      if (isMode(attr)) return attr;
    }
    if (this.options.modeStorageKey !== null && typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(this.options.modeStorageKey);
        if (isMode(stored)) return stored;
      } catch {
        /* ignoré */
      }
    }
    return this.options.defaultMode;
  }

  private effectiveDocument(base: ThemeDocument): ThemeDocument {
    return mergeByPriority<Record<string, unknown>>(
      base,
      this.globalOverrides as Array<{ priority: number; document: Record<string, unknown> }>,
    ) as ThemeDocument;
  }

  /** Compile le document effectif (base + surcharges globales) et laisse TokiForge l'injecter et gérer le mode. */
  private render(base: LoadedTheme): ThemeVars {
    const compiled = compileTheme(this.effectiveDocument(base.document));
    if (compiled.rejected.length && process.env.NODE_ENV !== 'production')
      console.warn(`${LOG} ⚠️  Valeurs ignorées :\n  ${compiled.rejected.join('\n  ')}`);

    const mode = this.state.mode;
    this.controller?.destroy();
    this.controller = new ThemeController(toThemeConfig(compiled), {
      selector: this.options.targetSelector,
      prefix: CSS_VAR_PREFIX,
      defaultTheme: mode,
      persist: this.options.modeStorageKey !== null,
      storageKey: this.options.modeStorageKey ?? undefined,
      onThemeChange: (name) => isMode(name) && this.onModeApplied(name),
    });
    this.controller.init();
    this.setState({
      status: 'applied',
      error: null,
      activeTheme: base,
      cssVarsCount: count(compiled.vars),
      lastApplied: Date.now(),
    });
    for (const scope of this.appOverrides.keys()) this.recomputeScope(scope);
    return compiled.vars;
  }

  /** Après un changement des surcharges globales : recompiler (avant le 1er rendu, elles sont prises en compte au rendu). */
  private rerender(): void {
    if (this.state.activeTheme) this.render(this.state.activeTheme);
    this.setState({ activeGlobalOverrides: this.globalOverrides.map((o) => o.id) });
  }

  private rehydrate(): void {
    if (this.rehydrated) return;
    this.rehydrated = true;
    for (const o of this.store.load())
      if (!this.globalOverrides.some((e) => e.id === o.id)) this.globalOverrides.push(o);
    this.setState({ activeGlobalOverrides: this.globalOverrides.map((o) => o.id) });
  }

  private onModeApplied(mode: ThemeMode): void {
    const changed = mode !== this.state.mode;
    applyModeAttribute(mode);
    this.setState({ mode });
    if (changed) this.options.onModeChanged?.(mode);
  }

  private recomputeScope(scope: string): void {
    const entries = this.appOverrides.get(scope);
    if (!entries || entries.length === 0) removeScopedCss(scope);
    else {
      const merged = mergeByPriority<Record<string, unknown>>(
        {},
        entries as Array<{ priority: number; document: Record<string, unknown> }>,
      );
      injectScopedCss(scope, buildThemeCss(compileTheme(merged), `[data-egen-app='${scope}']`));
    }
    this.setState({ activeOverrideScopes: [...this.appOverrides.keys()] });
  }

  private setState(partial: Partial<ThemeEngineState>): void {
    this.state = { ...this.state, ...partial };
    for (const l of this.listeners) l(this.getState());
  }
}
