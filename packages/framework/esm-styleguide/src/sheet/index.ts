/** @category Sheet */
export * from './sheet.context';
export * from './sheet-root.component';
export * from './sheet-portal.component';
export * from './sheet-overlay.component';
export * from './sheet-trigger.component';
export * from './sheet-content.component';
export * from './sheet-parts.component';

import { SheetRoot } from './sheet-root.component';

/**
 * `Sheet` — alias de `SheetRoot`, pour un usage en compound component :
 * `<Sheet side="top">...</Sheet>` avec `SheetTrigger`, `SheetContent`,
 * `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`, `SheetClose`.
 */
export const Sheet = SheetRoot;
