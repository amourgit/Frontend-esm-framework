/** @module @category UI */

/**
 * Assemble des classes Tailwind : les valeurs falsy (`undefined`, `null`, `false`, chaîne vide) sont ignorées et la dernière
 * classe en conflit gagne (`cn('px-4', 'px-2')` → `px-2`). Implémentation : `ui/cn.ts` (clsx + tailwind-merge).
 *
 * @example
 * cn('fixed inset-0', isActive && 'opacity-100', className)
 */
export { cn } from '../ui/cn.js';
