/** @module @category UI */
import React from 'react';
import { getCoreTranslation } from '@egen-civitas/esm-translations';
import { Button } from '../ui/index.js';
import { cn } from '../ui/cn.js';

export interface TableBatchActionsProps extends Omit<React.ComponentProps<'div'>, 'onCancel'> {
  /** Affiche la barre (sans lui, rien n'est rendu). */
  shouldShowBatchActions?: boolean;
  /** Nombre de lignes sélectionnées. */
  totalSelected: number;
  /** Nombre total de lignes : propose « Tout sélectionner » quand il est supérieur à la sélection. */
  totalCount?: number;
  onCancel: () => void;
  onSelectAll?: () => void;
}

/**
 * Barre d'actions par lots d'un tableau : nombre de lignes sélectionnées, actions (en enfants, ex. des `Button`),
 * « Tout sélectionner » et « Annuler ». Les textes viennent des traductions du core.
 */
export const TableBatchActions: React.FC<TableBatchActionsProps> = ({
  shouldShowBatchActions = true,
  totalSelected,
  totalCount,
  onCancel,
  onSelectAll,
  className,
  children,
  ...props
}) => {
  if (!shouldShowBatchActions) return null;
  const label =
    totalSelected === 1
      ? getCoreTranslation('batchActionItemSelected', '{{totalSelected}} item selected', { totalSelected })
      : getCoreTranslation('batchActionsItemsSelected', '{{totalSelected}} items selected', { totalSelected });
  return (
    <div
      role="toolbar"
      aria-label={label}
      className={cn('flex items-center gap-2 bg-primary px-4 py-2 text-primary-foreground', className)}
      {...props}
    >
      <span className="mr-auto text-sm font-semibold" aria-live="polite">
        {label}
      </span>
      {children}
      {onSelectAll && totalCount !== undefined && totalSelected < totalCount ? (
        <Button type="button" variant="ghost" size="sm" onClick={onSelectAll} className="text-current hover:bg-(--foreground)/15">
          {getCoreTranslation('selectAll', 'Select all')}
        </Button>
      ) : null}
      <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-current hover:bg-(--foreground)/15">
        {getCoreTranslation('cancel', 'Cancel')}
      </Button>
    </div>
  );
};
