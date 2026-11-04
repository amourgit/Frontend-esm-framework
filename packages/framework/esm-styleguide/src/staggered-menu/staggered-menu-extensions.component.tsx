import React, { useCallback, useContext, useMemo } from 'react';
import { type StaggeredMenuArea } from '@egen-civitas/esm-extensions';
import { ComponentContext, ExtensionSlot } from '@egen-civitas/esm-react-utils';
import { staggeredMenuEntryTitle, type StaggeredMenuEntry } from './use-staggered-menu-entries.js';

/**
 * État transmis en props à chaque composant d'extension du panneau (via `ExtensionSlot`). Les extensions
 * vivent dans leur propre racine React : un contexte ne les traverse pas, d'où ces props.
 */
export type StaggeredMenuExtensionState = {
  /** Ferme le panneau (ex. après un clic sur un lien du composant). */
  closeMenu: () => void;
  /** Côté d'où le panneau glisse. */
  position: 'left' | 'right';
  /** Le panneau est ouvert. */
  isOpen: boolean;
};

/**
 * Contexte de secours : `ExtensionSlot` exige un `ComponentContext`. Dans une app (egenComponentDecorator)
 * il existe déjà ; ce repli couvre un panneau monté hors décorateur (racine autonome du shell).
 */
const FALLBACK_CONTEXT = { moduleName: '@egen-civitas/esm-styleguide', featureName: 'staggered-menu' } as const;

interface EntryProps {
  entry: StaggeredMenuEntry;
  slotName: string;
  state: StaggeredMenuExtensionState;
  /** Le contenu n'est chargé qu'à la première ouverture du panneau. */
  loadContent: boolean;
}

function StaggeredMenuEntryView({ entry, slotName, state, loadContent }: EntryProps) {
  const title = staggeredMenuEntryTitle(entry);
  const select = useCallback(
    <T extends { name: string }>(extensions: T[]) => extensions.filter((extension) => extension.name === entry.id),
    [entry.id],
  );

  return (
    <section
      className="sm-ext"
      data-extension={entry.id}
      data-area={entry.area}
      aria-label={entry.meta.showTitle ? undefined : title}
      aria-labelledby={entry.meta.showTitle ? `sm-ext-title-${entry.id}` : undefined}
    >
      {entry.meta.showTitle && (
        <h3 className="sm-ext-title" id={`sm-ext-title-${entry.id}`}>
          {title}
        </h3>
      )}
      {loadContent && <ExtensionSlot name={slotName} select={select} state={state} className="sm-ext-slot" />}
    </section>
  );
}

interface AreaProps {
  area: StaggeredMenuArea;
  entries: StaggeredMenuEntry[];
  slotName: string;
  state: StaggeredMenuExtensionState;
  loadContent: boolean;
}

/** Une zone du panneau : ses entrées dans l'ordre résolu. Ne rend rien quand la zone est vide. */
export function StaggeredMenuExtensionArea({ area, entries, slotName, state, loadContent }: AreaProps) {
  const context = useContext(ComponentContext);
  const value = context?.moduleName ? context : FALLBACK_CONTEXT;
  const inArea = useMemo(() => entries.filter((entry) => entry.area === area), [entries, area]);
  if (inArea.length === 0) return null;

  return (
    <ComponentContext.Provider value={value}>
      <div className="sm-ext-area" data-area={area}>
        {inArea.map((entry) => (
          <StaggeredMenuEntryView
            key={entry.id}
            entry={entry}
            slotName={slotName}
            state={state}
            loadContent={loadContent}
          />
        ))}
      </div>
    </ComponentContext.Provider>
  );
}
