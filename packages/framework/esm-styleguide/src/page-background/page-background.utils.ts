/** @module @category UI */

/**
 * Concatène des classes CSS en ignorant les valeurs falsy (`undefined`,
 * `null`, `false`, chaîne vide). Pratique pour composer des classes
 * Tailwind conditionnelles sans dépendre d'une librairie externe
 * (`clsx`/`classnames`) pour un besoin aussi simple.
 *
 * @example
 * cn('fixed inset-0', isActive && 'opacity-100', className)
 */
export function cn(...classes: Array<string | undefined | null | false>): string {
  return classes.filter(Boolean).join(' ');
}
