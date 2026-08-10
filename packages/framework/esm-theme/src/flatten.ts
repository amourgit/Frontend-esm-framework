// ============================================================================
//  EGEN THEME ENGINE — Flatten JSON → variables CSS (résolution light/dark)
// ============================================================================

import type { FlattenResult } from './types';

const DEFAULT_IGNORE_KEYS = ['priority', 'meta'];
const DEFAULT_SEPARATOR = '-';
const DEFAULT_PREFIX = '';

/**
 * Convertit "backdropFilter" → "backdrop-filter" (camelCase → kebab-case)
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Nettoie un segment de clé pour un usage valide dans un nom de variable CSS.
 * "2xl" → "2xl", "backdropFilter" → "backdrop-filter"
 */
function sanitizeSegment(segment: string): string {
  const kebab = toKebabCase(String(segment));
  return kebab.replace(/[^a-zA-Z0-9-]/g, '-');
}

/**
 * Liste blanche des caractères autorisés dans une valeur CSS générée
 * dynamiquement depuis un thème JSON (potentiellement chargé depuis une
 * URL distante / un endpoint tenant non totalement fiable).
 *
 * Volontairement permissive sur le VOCABULAIRE (le schéma reste ouvert :
 * couleurs hex/rgb/hsl/oklch, longueurs avec toutes unités, fonctions CSS
 * usuelles `blur()`, `cubic-bezier()`, `calc()`, piles de polices `"Inter", sans-serif`...)
 * mais STRICTE sur la STRUCTURE : aucun caractère de cette liste ne permet
 * de fermer une déclaration (`;`), de fermer/ouvrir un bloc (`{` `}`), ou
 * d'ouvrir un commentaire CSS (`/*`) — donc AUCUNE valeur, quelle qu'elle
 * soit, ne peut faire sortir le parseur CSS de la déclaration
 * `--nom: <valeur>;` dans laquelle elle est insérée. C'est ce qui rend
 * l'injection structurelle impossible, indépendamment du contenu.
 *
 * `<` et `>` sont exclus en défense en profondeur (empêche toute tentative
 * de fermeture de balise `</style>` si jamais ce texte finissait, par
 * erreur d'implémentation future, injecté ailleurs qu'en `textContent`).
 * Les backslashes sont exclus (empêchent les séquences d'échappement CSS
 * permettant de reconstituer un caractère interdit, ex: `\7B` = `{`).
 *
 * Caractères supplémentaires autorisés (aucun d'eux ne permet de fermer une
 * déclaration/bloc ni d'ouvrir un commentaire — même invariant de sécurité
 * que ci-dessus, juste un VOCABULAIRE plus large) :
 *   `&` — piles de polices avec esperluette (ex: "Poppins & Sans"),
 *         sélecteurs imbriqués SCSS ne sont PAS concernés ici (valeurs, pas sélecteurs)
 *   `*` — multiplication dans calc() : `calc(var(--x) * 2)`
 *   `=` — syntaxe `in srgb` n'en a pas besoin, mais color-interpolation-method
 *         futures (ex: `oklch(from var(--x) l c h)`) peuvent en dépendre
 *   `@` — requêtes de fonctionnalité CSS imbriquées dans une valeur (rare mais valide)
 *   `[` `]` — attribut CSS et notation function() avec arguments nommés modernes
 *   `~` `^` — combinateurs texte-only jamais problématiques en valeur de propriété
 */
const SAFE_CSS_VALUE_RE = /^[a-zA-Z0-9 ,.#%()_+\-:/!'"&*=@[\]~^]*$/;

const MAX_VALUE_LENGTH = 1000;

/** Schémes d'URL autorisés dans un éventuel `url(...)` — bloque `javascript:`, `data:text/html`, etc. */
const SAFE_URL_RE = /url\(\s*['"]?(https:\/\/|\/(?!\/))/gi;
const ANY_URL_RE = /url\(/gi;

/**
 * Valide qu'une valeur sérialisée est sûre à injecter telle quelle dans une
 * feuille de style. Retourne `{ ok: true }` ou `{ ok: false, reason }`.
 *
 * Politique : REJET (pas de mutation silencieuse). Une valeur refusée est
 * purement et simplement exclue du CSS généré (avec un warning explicite),
 * plutôt que d'être "nettoyée" de façon imprévisible — un fragment
 * partiellement modifié peut donner un résultat visuellement cassé sans que
 * personne ne comprenne pourquoi.
 */
function isSafeCssValue(value: string): { ok: true } | { ok: false; reason: string } {
  if (value.length > MAX_VALUE_LENGTH) {
    return { ok: false, reason: `valeur trop longue (${value.length} > ${MAX_VALUE_LENGTH} caractères)` };
  }
  if (!SAFE_CSS_VALUE_RE.test(value)) {
    return { ok: false, reason: 'contient un ou plusieurs caractères non autorisés' };
  }
  // Toute occurrence de url(...) doit pointer vers https:// ou un chemin relatif au site (anti data:/javascript:/exfiltration)
  const urlMatches = value.match(ANY_URL_RE) ?? [];
  const safeUrlMatches = value.match(SAFE_URL_RE) ?? [];
  if (urlMatches.length !== safeUrlMatches.length) {
    return { ok: false, reason: "url(...) doit utiliser le schéma https:// ou un chemin relatif au site" };
  }
  return { ok: true };
}

/**
 * Sérialise une valeur feuille en string CSS exploitable, en validant
 * qu'elle est sûre. Retourne `null` si la valeur est rejetée (l'appelant
 * doit alors omettre la variable plutôt que d'injecter une valeur partielle).
 * - Array  → "Poppins, sans-serif"
 * - null   → "initial"
 * - bool   → "true" / "false"
 * - autres → String()
 */
function serializeLeaf(value: unknown, varNameForWarning: string): string | null {
  let serialized: string;

  if (Array.isArray(value)) {
    serialized = value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ');
  } else if (value === null) {
    serialized = 'initial';
  } else if (typeof value === 'boolean') {
    serialized = value ? 'true' : 'false';
  } else {
    serialized = String(value);
  }

  const verdict = isSafeCssValue(serialized);
  if (!verdict.ok) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`[egen/esm-theme] ⚠️  Valeur rejetée pour "${varNameForWarning}" : ${verdict.reason}`);
    }
    return null;
  }

  return serialized;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Détecte une "branche thématisable" : un nœud dont les SEULES clés sont
 * "light" et/ou "dark". Ce mécanisme est totalement générique — n'importe
 * quelle clé du schéma (colors.surface, colors.border, panel, ou toute
 * extension future ajoutée par une app) bénéficie automatiquement de la
 * résolution de mode sans aucune logique spécifique à écrire.
 */
function isThemableBranch(node: Record<string, unknown>): boolean {
  const keys = Object.keys(node);
  if (keys.length === 0) return false;
  return keys.every((k) => k === 'light' || k === 'dark');
}

export interface FlattenOptions {
  prefix?: string;
  separator?: string;
  ignoreRootKeys?: string[];
}

/**
 * Aplatit récursivement un objet JSON de thème en 3 groupes de variables CSS :
 * `base` (communes à tous les modes), `light` et `dark`.
 *
 * @example
 * flattenToCssVars({ colors: { primary: { 500: "#6366f1" } } })
 * // → { base: { "--colors-primary-500": "#6366f1" }, light: {}, dark: {} }
 *
 * flattenToCssVars({ panel: { dark: { card: { background: "rgba(15,23,42,0.65)" } } } })
 * // → { base: {}, light: {}, dark: { "--panel-card-background": "rgba(15,23,42,0.65)" } }
 *
 * Notez que le nom de variable ne contient JAMAIS "light"/"dark" — c'est le
 * sélecteur CSS (`[data-theme="dark"]`) qui active le bon groupe au runtime.
 */
export function flattenToCssVars(obj: Record<string, unknown>, options: FlattenOptions = {}): FlattenResult {
  const { prefix = DEFAULT_PREFIX, separator = DEFAULT_SEPARATOR, ignoreRootKeys = DEFAULT_IGNORE_KEYS } = options;

  const result: FlattenResult = { base: {}, light: {}, dark: {} };

  function walk(node: unknown, segments: string[], depth: number, bucket: keyof FlattenResult): void {
    if (isPlainObject(node)) {
      if (depth > 0 && isThemableBranch(node)) {
        if (node.light !== undefined) walk(node.light, segments, depth + 1, 'light');
        if (node.dark !== undefined) walk(node.dark, segments, depth + 1, 'dark');
        return;
      }

      for (const [key, value] of Object.entries(node)) {
        if (depth === 0 && ignoreRootKeys.includes(key)) continue;
        const cleanKey = sanitizeSegment(key);
        walk(value, [...segments, cleanKey], depth + 1, bucket);
      }
    } else {
      const parts = prefix ? [prefix, ...segments] : segments;
      const varName = `--${parts.join(separator)}`;
      const safeValue = serializeLeaf(node, varName);
      if (safeValue !== null) {
        result[bucket][varName] = safeValue;
      }
    }
  }

  walk(obj, [], 0, 'base');
  return result;
}
