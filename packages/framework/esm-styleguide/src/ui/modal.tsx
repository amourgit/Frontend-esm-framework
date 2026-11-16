import * as React from 'react';
import { XIcon } from 'lucide-react';
import { cn } from './cn.js';

// Parties d'une modale ouverte par `showModal` (le cadre — fenêtre, fond, Échap — est fourni par `modals/index.tsx`).
// À placer au premier niveau du composant de la modale (dans un fragment) pour que le corps défile correctement.
// Pour une boîte de dialogue contrôlée par l'état d'un composant, utiliser `Dialog` (Radix) à la place.

type ModalHeaderProps = Omit<React.ComponentProps<'div'>, 'title'> & {
  title?: React.ReactNode;
  /** Petit texte au-dessus du titre (ex. le nom du patient, de l'espace…). */
  label?: React.ReactNode;
  /** Affiche une croix de fermeture qui appelle cette fonction. */
  onClose?: () => void;
  closeLabel?: string;
};

function ModalHeader({ title, label, onClose, closeLabel = 'Close', className, children, ...props }: ModalHeaderProps) {
  return (
    <div
      data-slot="modal-header"
      className={cn('relative flex shrink-0 flex-col gap-1 border-b px-6 py-4 pr-14 text-left', className)}
      {...props}
    >
      {label ? <p className="text-xs text-muted-foreground">{label}</p> : null}
      {title ? <h2 className="text-lg leading-snug font-semibold">{title}</h2> : null}
      {children}
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          title={closeLabel}
          className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function ModalBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="modal-body" className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-4', className)} {...props} />;
}

function ModalFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="modal-footer"
      className={cn('flex shrink-0 flex-wrap items-center justify-end gap-2 border-t px-6 py-4', className)}
      {...props}
    />
  );
}

export { ModalHeader, ModalBody, ModalFooter, type ModalHeaderProps };
