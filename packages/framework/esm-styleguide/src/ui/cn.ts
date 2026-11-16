import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Assemble des classes Tailwind : `clsx` pour les conditions, `tailwind-merge` pour que la dernière classe gagne
 * (`cn('px-4', 'px-2')` → `px-2`). C'est ce qui rend chaque composant de `ui/` entièrement surchargeable par `className`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
