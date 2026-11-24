# @egen-civitas/tailwind-preset

Point d'entrée Tailwind v4 partagé pour les apps EGEN : il rattache les utilitaires (`bg-primary-600`, `bg-card`, `border-border`, `rounded-lg`, `shadow-sm`, `font-sans`…) aux variables du thème, sans rien dupliquer dans chaque app.

## Ce que le preset fait

- **Utilitaires de couleur** : surfaces, texte et bordures sémantiques (`background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `chart-1…5`, `sidebar*`), et échelles `primary-*`, `error-*` (échelle de `destructive`), `neutral-*`, `success-*`, `warning-*`, `info-*`.
- **Rayons, ombres, polices** : `rounded-*` (échelle calculée sur `--radius` du thème), `shadow-*`, `font-sans|serif|mono`.
- **Mode sombre** : le variant `dark:` suit la classe `.dark` posée sur la racine par `@egen-civitas/esm-theme` (et non la préférence système du navigateur).
- Les variables elles-mêmes ne sont **pas** déclarées ici : les clés sémantiques viennent du thème (écrit par `@egen-civitas/esm-theme`), les échelles dérivées et les constantes sont déclarées une seule fois dans la feuille globale du styleguide, que le shell charge toujours. Les utilitaires reprennent directement `var(--…)` (`@theme inline`) : ils suivent donc les changements de thème à l'exécution.

## Prérequis

La règle rspack `*.tw.css` fournie par `@egen-civitas/rspack-config` (>= version incluant `tailwindRuleConfig`).

## Usage

```ts
// root.component.tsx, tout en haut, avant les autres imports de style
import '@egen-civitas/tailwind-preset/tailwind.tw.css';
```

## Surcharger un composant du framework (SCSS) avec Tailwind

Voir le commentaire en tête de `tailwind.tw.css` : utiliser le modificateur `!` de Tailwind v4 (`bg-primary-500!`) uniquement quand la classe doit surcharger un style SCSS existant sur le même élément (le SCSS du framework n'est pas dans un `@layer`, donc une classe Tailwind normale ne le bat pas). Pas nécessaire sur tes propres composants qui ne partagent pas de sélecteur avec `esm-styleguide`.
