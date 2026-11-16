import * as React from 'react';
import { CheckCircle2Icon, XCircleIcon } from 'lucide-react';
import { cn } from './cn.js';
import { Spinner } from './spinner.js';

type InlineLoadingProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  /** `active` : en cours (spinner) · `finished` : réussi · `error` : échec · `inactive` : rien d'affiché. */
  status?: 'active' | 'finished' | 'error' | 'inactive';
  /** Texte à côté de l'indicateur. */
  description?: React.ReactNode;
};

/** Indicateur de chargement en ligne (bouton qui enregistre, ligne qui se met à jour…), annoncé aux lecteurs d'écran. */
function InlineLoading({ status = 'active', description, className, ...props }: InlineLoadingProps) {
  if (status === 'inactive') return null;
  return (
    <div
      data-slot="inline-loading"
      data-status={status}
      role="status"
      aria-live="polite"
      className={cn('inline-flex items-center gap-2 text-sm text-muted-foreground', className)}
      {...props}
    >
      {status === 'active' && <Spinner aria-label={undefined} role="presentation" />}
      {status === 'finished' && <CheckCircle2Icon className="size-4 text-emerald-500" aria-hidden="true" />}
      {status === 'error' && <XCircleIcon className="size-4 text-destructive" aria-hidden="true" />}
      {description ? <span>{description}</span> : null}
    </div>
  );
}

export { InlineLoading, type InlineLoadingProps };
