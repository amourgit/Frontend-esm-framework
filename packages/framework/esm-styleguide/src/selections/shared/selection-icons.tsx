import * as React from 'react';

/**
 * Icônes SVG inline partagées par les composants Tailwind de la catégorie
 * « selections » (MorphSelect, Combobox…).
 *
 * Les tracés sont ceux de `lucide-react` (ChevronDown, Check, ChevronsUpDown,
 * Search) : le design d'origine des composants est ainsi conservé à
 * l'identique SANS ajouter la dépendance `lucide-react` au styleguide.
 * Chaque icône accepte les props SVG standard (`className`, `strokeWidth`…).
 */
type IconProps = React.SVGProps<SVGSVGElement>;

const base = (props: IconProps): IconProps => ({
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  width: 24,
  height: 24,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
  ...props,
});

export const SelectionChevronDownIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const SelectionCheckIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const SelectionChevronsUpDownIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m7 15 5 5 5-5" />
    <path d="m7 9 5-5 5 5" />
  </svg>
);

export const SelectionSearchIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
