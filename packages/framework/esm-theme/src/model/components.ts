// Convention des tokens de composants (cahier des charges §8, §15) :
//   components.<composant>.<variante>.<état>.<propriété>   →   --egen-components-<composant>-<variante>-<état>-<propriété>
// Cascade (du plus spécifique au plus général) : variante/état → variante/default → base/état → base/default → repli global.
// Le navigateur la résout seul grâce aux `var()` imbriquées : changer de thème ne demande aucune modification des composants.
import { CSS_VAR_PREFIX } from '../tokiforge/compile.js';

export const BASE_VARIANT = 'base';
export const DEFAULT_STATE = 'default';

const kebab = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');

/** Nom de la variable CSS d'un token de composant (même règle de nommage que le compilateur de thème). */
export const componentVarName = (component: string, variant: string, state: string, prop: string): string =>
  `--${CSS_VAR_PREFIX}-${['components', component, variant || BASE_VARIANT, state || DEFAULT_STATE, prop].map(kebab).join('-')}`;

/** Les variables de la cascade, de la plus spécifique à la plus générale (sans doublon). */
export function componentCascade(component: string, variant: string, state: string, prop: string): string[] {
  const v = variant || BASE_VARIANT;
  const s = state || DEFAULT_STATE;
  const names = [
    componentVarName(component, v, s, prop),
    componentVarName(component, v, DEFAULT_STATE, prop),
    componentVarName(component, BASE_VARIANT, s, prop),
    componentVarName(component, BASE_VARIANT, DEFAULT_STATE, prop),
  ];
  return names.filter((n, i) => names.indexOf(n) === i);
}

/**
 * Expression CSS `var(--…, var(--…, repli))` implémentant la cascade.
 * @param fallback valeur utilisée si aucun niveau n'est défini (ex. `var(--egen-border-radius-md)`).
 */
export const componentVar = (
  component: string,
  variant: string,
  state: string,
  prop: string,
  fallback: string,
): string =>
  componentCascade(component, variant, state, prop)
    .reverse()
    .reduce((inner, name) => `var(${name}, ${inner})`, fallback);
