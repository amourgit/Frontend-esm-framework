import * as React from 'react';
import { cn } from './cn.js';

// Petite barre d'en-tête (fenêtres d'espace de travail, panneaux…) : remplace les `Header*` de Carbon.

function AppHeader({ className, ...props }: React.ComponentProps<'header'>) {
  return (
    <header
      data-slot="app-header"
      className={cn('relative flex h-12 items-center bg-card text-foreground', className)}
      {...props}
    />
  );
}

function AppHeaderName({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="app-header-name"
      className={cn('flex h-12 items-center truncate px-4 text-sm font-semibold', className)}
      {...props}
    />
  );
}

function AppHeaderBar({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="app-header-bar" className={cn('flex h-full items-center', className)} {...props} />;
}

/** Bouton carré de la barre (48 px) : `aria-label` obligatoire, repris en infobulle. */
function AppHeaderAction({
  className,
  type = 'button',
  'aria-label': ariaLabel,
  title,
  ...props
}: Omit<React.ComponentProps<'button'>, 'aria-label'> & { 'aria-label': string }) {
  return (
    <button
      data-slot="app-header-action"
      type={type}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className={cn(
        'inline-flex size-12 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent text-current outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  );
}

export { AppHeader, AppHeaderName, AppHeaderBar, AppHeaderAction };
