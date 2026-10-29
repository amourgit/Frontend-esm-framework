/** @category Section */
import React from 'react';
import { Extension, ExtensionSlot } from '@egen-civitas/esm-react-utils';
import type { AssignedExtension } from '@egen-civitas/esm-extensions';
import { cn } from '../page-background/page-background.utils.js';
import { stickyStyleVars } from './section-sticky.js';
import type { SectionSlotGap, SectionSlotProps } from './section.types.js';

// =============================================================================
//  SECTION SLOT — page composée de sections fournies par des extensions
//
//    Page hôte (ex. Accueil)            Apps contributrices
//    ┌──────────────────────┐           ┌ routes.json ───────────────────────┐
//    │ <SectionSlot         │  ◄─────── │ { "name": "news-section",          │
//    │   name="home-…" />   │           │   "slot": "home-sections",         │
//    └──────────────────────┘           │   "component": "newsSection",      │
//                                       │   "order": 10 }                    │
//                                       └────────────────────────────────────┘
//
//  Chaque extension rend sa propre `<Section>` (données, liens et règles
//  métier restent dans l'app qui la possède). Le slot ne fait que :
//    - ordonner / empiler les extensions (`order` de routes.json) ;
//    - poser les variables CSS qui activent les EN-TÊTES COLLANTS pour toutes
//      les sections du slot (héritage DOM : fonctionne d'un parcel à l'autre).
//
//  Réutilisable par n'importe quelle page : il suffit de choisir un nom de slot.
// =============================================================================

const GAP: Record<SectionSlotGap, string> = {
  none: 'gap-0',
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-10',
  xl: 'gap-14',
};

export function SectionSlot({
  name,
  state,
  select,
  stickyHeaders = true,
  stickyOffset = '0px',
  stickyZIndex = 10,
  gap = 'lg',
  renderItem,
  className,
  itemClassName,
  style,
}: SectionSlotProps) {
  const containerStyle: React.CSSProperties = {
    ...stickyStyleVars({ sticky: stickyHeaders, offset: stickyOffset, zIndex: stickyZIndex }),
    ...style,
  };
  const classes = cn('flex w-full min-w-0 flex-col', GAP[gap], className);

  return (
    <ExtensionSlot name={name} select={select} data-section-slot={name} className={classes} style={containerStyle}>
      {(extension: AssignedExtension) => {
        const element = <Extension state={state} />;
        const info = { name: extension.name, moduleName: extension.moduleName, meta: { ...extension.meta } };
        return (
          <div data-section-slot-item={extension.name} className={cn('min-w-0', itemClassName)}>
            {renderItem ? renderItem(element, info) : element}
          </div>
        );
      }}
    </ExtensionSlot>
  );
}
