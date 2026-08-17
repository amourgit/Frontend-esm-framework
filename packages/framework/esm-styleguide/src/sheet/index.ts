/** @category Sheet */
export * from './sheet.context.js';
export * from './sheet-root.component.js';
export * from './sheet-portal.component.js';
export * from './sheet-overlay.component.js';
export * from './sheet-trigger.component.js';
export * from './sheet-content.component.js';
export * from './sheet-parts.component.js';

import { SheetRoot } from './sheet-root.component.js';

/**
 * `Sheet` — alias de `SheetRoot`, pour un usage en compound component :
 * `<Sheet side="top">...</Sheet>` avec `SheetTrigger`, `SheetContent`,
 * `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`, `SheetClose`.
 */
export const Sheet = SheetRoot;
