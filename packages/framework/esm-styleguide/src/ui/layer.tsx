import * as React from 'react';
import { cn } from './cn.js';

/**
 * Simple surface : remplace le `Layer` de Carbon (qui n'existait que pour décaler les jetons de fond).
 * Ici, une `div` dont on choisit le fond par classe (`bg-card`, `bg-muted`…) ; aucun contexte caché.
 */
function Layer({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="layer" className={cn('bg-card text-card-foreground', className)} {...props} />;
}

export { Layer };
