// ============================================================================
//  EGEN THEME ENGINE — Injection CSS dans le DOM
// ============================================================================

import type { FlattenResult, ThemeMode } from './types';

const BASE_STYLE_TAG_ID = 'egen-theme-vars';
const OVERRIDE_STYLE_TAG_PREFIX = 'egen-theme-override-';

function buildVarLines(vars: Record<string, string>): string[] {
  return Object.entries(vars)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `  ${name}: ${value};`);
}

function buildBlock(selector: string, vars: Record<string, string>): string {
  const lines = buildVarLines(vars);
  if (lines.length === 0) return '';
  return `${selector} {\n${lines.join('\n')}\n}`;
}

/**
 * Construit le texte CSS complet pour un `FlattenResult` :
 * - `base`  → injecté sur `targetSelector` (en général `:root`)
 * - `light` → injecté sur `[data-theme="light"]` (active quand ce mode est résolu)
 * - `dark`  → injecté sur `[data-theme="dark"]`
 *
 * Le mode est résolu via l'attribut `data-theme` posé par le moteur sur
 * `<html>` (cf. engine.ts / mode.ts) — totalement générique, aucun composant
 * n'a besoin de connaître le mode actif : la cascade CSS s'en charge.
 */
export function buildThemeCssText(cssVars: FlattenResult, targetSelector = ':root'): string {
  const blocks = [
    buildBlock(targetSelector, cssVars.base),
    buildBlock(`${targetSelector}[data-theme='light'], [data-theme='light'] ${targetSelector}`, cssVars.light),
    buildBlock(`${targetSelector}[data-theme='dark'], [data-theme='dark'] ${targetSelector}`, cssVars.dark),
  ].filter(Boolean);

  return blocks.join('\n\n');
}

/**
 * Injecte les variables CSS du thème global dans le DOM via une balise
 * <style> dédiée, insérée en premier dans <head> pour que toute CSS d'app
 * chargée après puisse surcharger des variables individuelles par simple
 * cascade (sans avoir besoin du mécanisme de surcharge structuré).
 */
export function injectCssVarsToDocument(cssVars: FlattenResult, targetSelector = ':root'): void {
  if (typeof document === 'undefined') return; // SSR guard

  const cssText = buildThemeCssText(cssVars, targetSelector);

  let styleTag = document.getElementById(BASE_STYLE_TAG_ID) as HTMLStyleElement | null;

  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = BASE_STYLE_TAG_ID;
    styleTag.setAttribute('data-egen', 'theme');
    const firstChild = document.head.firstChild;
    document.head.insertBefore(styleTag, firstChild);
  }

  styleTag.textContent = cssText;
}

/**
 * Supprime les variables CSS globales du DOM (utile pour le cleanup / tests).
 */
export function removeCssVarsFromDocument(): void {
  if (typeof document === 'undefined') return;
  document.getElementById(BASE_STYLE_TAG_ID)?.remove();
}

/**
 * Injecte une surcharge de thème SCOPÉE à un sélecteur précis (typiquement
 * le conteneur racine d'une application : `[data-egen-app="mon-app"]`).
 *
 * Comme les variables non redéclarées dans la surcharge continuent
 * d'hériter du thème global par cascade CSS naturelle, il suffit d'injecter
 * uniquement les DELTAS — pas besoin de dupliquer tout le thème.
 *
 * Chaque scope possède sa propre balise <style>, identifiable et
 * supprimable indépendamment (`removeScopedCssVars`).
 */
export function injectScopedCssVars(scopeSelector: string, cssVars: FlattenResult, scopeId: string): void {
  if (typeof document === 'undefined') return;

  const tagId = `${OVERRIDE_STYLE_TAG_PREFIX}${scopeId}`;
  const cssText = buildThemeCssText(cssVars, scopeSelector);

  let styleTag = document.getElementById(tagId) as HTMLStyleElement | null;

  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = tagId;
    styleTag.setAttribute('data-egen', 'theme-override');
    styleTag.setAttribute('data-egen-scope', scopeId);
    // Les surcharges sont ajoutées en fin de <head> : elles doivent gagner
    // la cascade face au thème global (même spécificité de sélecteur,
    // l'ordre dans le DOM tranche).
    document.head.appendChild(styleTag);
  }

  styleTag.textContent = cssText;
}

/**
 * Retire la surcharge de thème associée à un scope donné.
 */
export function removeScopedCssVars(scopeId: string): void {
  if (typeof document === 'undefined') return;
  document.getElementById(`${OVERRIDE_STYLE_TAG_PREFIX}${scopeId}`)?.remove();
}

/**
 * Pose l'attribut `data-theme` sur l'élément racine (`<html>` par défaut)
 * pour activer le bon bloc `[data-theme="..."]` injecté par le moteur.
 */
export function applyModeAttribute(mode: ThemeMode, root: HTMLElement | null = typeof document !== 'undefined' ? document.documentElement : null): void {
  root?.setAttribute('data-theme', mode);
}

/**
 * Génère un bloc CSS `:root { ... }` en string — utile pour export statique
 * (ex: génération d'un fichier CSS au build pour un thème par défaut figé).
 */
export function buildCssString(cssVars: FlattenResult, targetSelector = ':root'): string {
  return buildThemeCssText(cssVars, targetSelector);
}
