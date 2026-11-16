// DOM minimal restant à EGEN. L'injection du thème de base et le mode sont assurés par TokiForge (`ThemeController` /
// `ThemeRuntime`). Ne restent ici que (1) les surcharges PAR APPLICATION, qu'un thème unique ne peut pas porter
// (ADR-004), et (2) l'attribut `data-theme` lu par les feuilles de style.
const OVERRIDE_STYLE_TAG_PREFIX = 'egen-theme-override-';

const hasDom = () => typeof document !== 'undefined';

export function injectScopedCss(scopeId: string, cssText: string): void {
  if (!hasDom()) return;
  const id = `${OVERRIDE_STYLE_TAG_PREFIX}${scopeId}`;
  let tag = document.getElementById(id) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = id;
    tag.setAttribute('data-egen', 'theme-override');
    tag.setAttribute('data-egen-scope', scopeId);
    document.head.appendChild(tag);
  }
  tag.textContent = cssText;
}

export function removeScopedCss(scopeId: string): void {
  if (hasDom()) document.getElementById(`${OVERRIDE_STYLE_TAG_PREFIX}${scopeId}`)?.remove();
}

export function applyModeAttribute(mode: 'light' | 'dark'): void {
  if (hasDom()) document.documentElement.setAttribute('data-theme', mode);
}
