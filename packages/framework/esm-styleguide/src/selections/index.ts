// ============================================================================
//  Catégorie « selections »
//  Composants de sélection dans une liste d'options (popover/dropdown avec
//  déclencheur, recherche optionnelle, rendu personnalisable) — tenants,
//  langues, utilisateurs, rôles, etc.
//
//  Composants Tailwind (design copié à l'identique, entièrement configurables
//  par le consommateur via props / classNames) : MorphSelect (trigger qui se
//  morphe en panneau), Autocomplete (capsule Material 3, multi-sélection,
//  création), Combobox (déclencheur + recherche, style shadcn), AsyncSelect
//  (options chargées de façon asynchrone : recherche serveur ou liste préchargée,
//  pagination, multi-sélection).
// ============================================================================
export * from './select-popover/index.js';
export * from './interactive-selector/index.js';
export * from './morph-select/index.js';
export * from './autocomplete/index.js';
export * from './combobox/index.js';
export * from './async-select/index.js';
