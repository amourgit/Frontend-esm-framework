import * as React from 'react';
import { cn } from './cn.js';

/**
 * Simple surface (ancien `Layer` : un fond au choix par classe, sans contexte caché).
 * Ici, une `div` dont on choisit le fond par classe (`bg-card`, `bg-muted`…) ; aucun contexte caché.
 */
function Layer({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="layer" className={cn('bg-card text-card-foreground', className)} {...props} />;
}

export { Layer };
