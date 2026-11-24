/**
 * Runtime navigateur du contrat de thème EGEN (format Tweakcn).
 *
 * - couche de base : un bloc <style> `:root { … } .dark { … }` ;
 * - mode clair/sombre : classe `dark` sur l'élément racine (convention shadcn / Tailwind v4, comme Tweakcn) ;
 * - surcharges : blocs <style> superposés après la base, globaux ou limités à une zone (`scope`) ;
 * - sans DOM (rendu serveur, tests Node), l'état est tenu à jour et rien n'est écrit.
 */
import {
  assertSafeThemeProps,
  assertSafeThemeStyles,
  formatColor,
  themeStylesToCss,
  THEME_COLOR_KEYS,
  type ThemeColorFormat,
  type ThemeMode,
  type ThemeStyleProps,
  type ThemeStyles,
} from './theme-styles.js';

export interface ThemeStylesRuntimeOptions {
  /** Élément portant la classe de mode. Défaut : document.documentElement. */
  root?: HTMLElement;
  /** Identifiant du <style> de base. Défaut : "egen-theme". */
  styleId?: string;
  /** Reformatage des couleurs. Défaut : "raw" (valeurs telles qu'enregistrées). */
  colorFormat?: ThemeColorFormat;
  /** Classe du mode sombre. Défaut : "dark". */
  darkClass?: string;
}

export type PartialThemeStyles = Partial<Record<ThemeMode, Partial<ThemeStyleProps>>>;

export type ThemeRuntimeEvent =
  | { type: 'apply'; styles: ThemeStyles }
  | { type: 'mode'; mode: ThemeMode }
  | { type: 'override'; id: string; removed: boolean };

/** Nom de la variable CSS d'une clé du contrat (quelques clés brutes ont un nom de variable différent). */
export function themeKeyToVariable(key: string): string {
  switch (key) {
    case 'shadow-offset-x':
      return 'shadow-x';
    case 'shadow-offset-y':
      return 'shadow-y';
    case 'letter-spacing':
      return 'tracking-normal';
    default:
      return key;
  }
}

const COLOR_KEYS = new Set<string>([...THEME_COLOR_KEYS, 'shadow-color']);
/** Sélecteur de zone : classes, id, attributs simples, combinateurs — sans accolades ni point-virgule. */
const SAFE_SCOPE_RE = /^[A-Za-z0-9\s.#\[\]="'_*>+~:,-]{1,200}$/;

export class ThemeStylesRuntime {
  private readonly rootOption?: HTMLElement;
  private readonly styleId: string;
  private readonly colorFormat: ThemeColorFormat;
  private readonly darkClass: string;
  private styles: ThemeStyles | null = null;
  private mode: ThemeMode = 'light';
  private readonly overrides = new Map<string, { css: string }>();
  private readonly listeners = new Set<(e: ThemeRuntimeEvent) => void>();

  constructor(options: ThemeStylesRuntimeOptions = {}) {
    this.rootOption = options.root;
    this.styleId = options.styleId ?? 'egen-theme';
    this.colorFormat = options.colorFormat ?? 'raw';
    this.darkClass = options.darkClass ?? 'dark';
  }

  /** Applique (ou remplace) le thème de base, puis le mode si fourni. */
  apply(styles: ThemeStyles, mode?: ThemeMode): void {
    assertSafeThemeStyles(styles); // les données viennent du réseau : refusées avant toute écriture
    this.styles = styles;
    this.writeBase();
    if (mode) this.setMode(mode, false);
    this.emit({ type: 'apply', styles });
  }

  getStyles(): ThemeStyles | null {
    return this.styles;
  }

  getMode(): ThemeMode {
    return this.mode;
  }

  setMode(mode: ThemeMode, notify = true): void {
    this.mode = mode;
    const root = this.root();
    if (root) root.classList.toggle(this.darkClass, mode === 'dark');
    if (notify) this.emit({ type: 'mode', mode });
  }

  toggleMode(): ThemeMode {
    const next: ThemeMode = this.mode === 'dark' ? 'light' : 'dark';
    this.setMode(next);
    return next;
  }

  /**
   * Superpose des valeurs partielles au thème de base. `scope` (sélecteur CSS) limite l'effet à une zone ;
   * sans `scope`, la surcharge est globale. Réutiliser le même `id` remplace la surcharge précédente.
   */
  setOverride(id: string, partial: PartialThemeStyles, options: { scope?: string } = {}): void {
    assertSafeThemeProps(partial.light as Record<string, unknown> | undefined, 'light');
    assertSafeThemeProps(partial.dark as Record<string, unknown> | undefined, 'dark');
    if (options.scope !== undefined && !SAFE_SCOPE_RE.test(options.scope)) throw new Error('scope invalide');
    const css = this.buildOverrideCss(partial, options.scope);
    this.overrides.set(id, { css });
    this.writeOverride(id, css);
    this.emit({ type: 'override', id, removed: false });
  }

  removeOverride(id: string): void {
    if (!this.overrides.delete(id)) return;
    this.doc()?.querySelector(`style[data-egen-override="${cssEscape(id)}"]`)?.remove();
    this.emit({ type: 'override', id, removed: true });
  }

  clearOverrides(): void {
    for (const id of [...this.overrides.keys()]) this.removeOverride(id);
  }

  listOverrides(): string[] {
    return [...this.overrides.keys()];
  }

  subscribe(listener: (e: ThemeRuntimeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Retire les blocs <style> et la classe de mode. */
  destroy(): void {
    const doc = this.doc();
    doc?.getElementById(this.styleId)?.remove();
    this.overrides.clear();
    doc?.querySelectorAll('style[data-egen-override]').forEach((n) => n.remove());
    this.root()?.classList.remove(this.darkClass);
    this.listeners.clear();
    this.styles = null;
  }

  // -------------------------------------------------------------------------------------------------------------------

  private doc(): Document | null {
    return typeof document === 'undefined' ? null : document;
  }

  private root(): HTMLElement | null {
    return this.rootOption ?? this.doc()?.documentElement ?? null;
  }

  private emit(e: ThemeRuntimeEvent): void {
    this.listeners.forEach((l) => l(e));
  }

  private writeBase(): void {
    const doc = this.doc();
    if (!doc || !this.styles) return;
    let el = doc.getElementById(this.styleId) as HTMLStyleElement | null;
    if (!el) {
      el = doc.createElement('style');
      el.id = this.styleId;
      // La base passe toujours avant les surcharges.
      const firstOverride = doc.head.querySelector('style[data-egen-override]');
      doc.head.insertBefore(el, firstOverride);
    }
    el.textContent = themeStylesToCss(this.styles, { colorFormat: this.colorFormat });
  }

  private writeOverride(id: string, css: string): void {
    const doc = this.doc();
    if (!doc) return;
    const selector = `style[data-egen-override="${cssEscape(id)}"]`;
    let el = doc.head.querySelector(selector) as HTMLStyleElement | null;
    if (!el) {
      el = doc.createElement('style');
      el.setAttribute('data-egen-override', id);
      doc.head.appendChild(el);
    }
    el.textContent = css;
  }

  private buildOverrideCss(partial: PartialThemeStyles, scope?: string): string {
    const rule = (selector: string, props?: Partial<ThemeStyleProps>) => {
      const decls = Object.entries(props ?? {})
        .filter((e): e is [string, string] => typeof e[1] === 'string')
        .map(([k, v]) => `\n  --${themeKeyToVariable(k)}: ${COLOR_KEYS.has(k) ? formatColor(v, this.colorFormat) : v};`)
        .join('');
      return decls ? `${selector} {${decls}\n}` : '';
    };
    const light = scope ?? ':root';
    const dark = scope ? `.${this.darkClass} ${scope}` : `.${this.darkClass}`;
    return [rule(light, partial.light), rule(dark, partial.dark)].filter(Boolean).join('\n\n');
  }
}

function cssEscape(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}
