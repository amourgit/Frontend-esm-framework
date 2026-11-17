import * as React from 'react';
import { cn } from './cn.js';

// Liste structurée (lignes de cellules alignées, ex. l'arbre de configuration) : remplace `StructuredList*` de Carbon.
// Sémantique « tableau » par rôles ARIA : `StructuredList` > `StructuredListRow` > `StructuredListCell`.

function StructuredList({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="structured-list" role="table" className={cn('flex w-full flex-col', className)} {...props} />;
}

function StructuredListHead({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="structured-list-head"
      role="rowgroup"
      className={cn('border-b text-xs font-semibold text-muted-foreground', className)}
      {...props}
    />
  );
}

function StructuredListBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="structured-list-body" role="rowgroup" className={cn('flex flex-col', className)} {...props} />;
}

function StructuredListRow({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="structured-list-row"
      role="row"
      className={cn('flex items-center border-b border-border last:border-b-0', className)}
      {...props}
    />
  );
}

function StructuredListCell({ className, head = false, ...props }: React.ComponentProps<'div'> & { head?: boolean }) {
  return (
    <div
      data-slot="structured-list-cell"
      role={head ? 'columnheader' : 'cell'}
      className={cn('min-w-0 flex-1 px-3 py-2 text-sm', className)}
      {...props}
    />
  );
}

export { StructuredList, StructuredListHead, StructuredListBody, StructuredListRow, StructuredListCell };
