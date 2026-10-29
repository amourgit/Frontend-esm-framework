/** @category Section */
import { createContext, useContext } from 'react';
import type {
  SectionClassNames,
  SectionDensity,
  SectionFooterLayout,
  SectionHeaderLayout,
  SectionLabels,
  SectionTone,
} from './section.types.js';

export interface SectionContextValue {
  tone: SectionTone;
  density: SectionDensity;
  classNames: SectionClassNames;
  labels: SectionLabels;
  headerLayout: SectionHeaderLayout;
  footerLayout: SectionFooterLayout;
  divider: boolean;
  footerDivider: boolean;
  collapsible: boolean;
  collapsed: boolean;
  toggle: () => void;
  headingId?: string;
  bodyId?: string;
  /** Change quand le mode collant demandé par la section change (re-lecture du style calculé). */
  stickyKey?: string;
}

export const DEFAULT_SECTION_LABELS: SectionLabels = {
  collapse: 'Replier la section',
  expand: 'Déplier la section',
};

/** Valeurs par défaut : permet d'utiliser les parties hors d'un `Section`. */
export const SectionContext = createContext<SectionContextValue>({
  tone: 'onDark',
  density: 'comfortable',
  classNames: {},
  labels: DEFAULT_SECTION_LABELS,
  headerLayout: 'split',
  footerLayout: 'between',
  divider: true,
  footerDivider: true,
  collapsible: false,
  collapsed: false,
  toggle: () => undefined,
});

export function useSectionContext(): SectionContextValue {
  return useContext(SectionContext);
}
