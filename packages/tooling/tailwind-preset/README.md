# @egen-civitas/tailwind-preset

Point d'entrée Tailwind v4 partagé pour les apps EGEN — évite de dupliquer le pont vers les tokens de `@egen-civitas/esm-theme` dans chaque app.

> **Statut : OBSOLÈTE pour le pont de variables.** Le pont vers les tokens de `esm-theme` (ancien moteur, variables `--colors-*`) sera retiré lors de la bascule vers TokiForge (étape P2.5 de `Frontend-esm-core`, `docs/reforme-tokiforge/SUIVI.md` et `PARCOURS-COMPLET.md`) ; le preset y déclarera les constantes (typographie, transitions, z-index, couleurs d'état).

## Prérequis

La règle rspack `*.tw.css` fournie par `@egen-civitas/rspack-config` (>= version incluant `tailwindRuleConfig`).

## Usage

```ts
// root.component.tsx, tout en haut, avant les autres imports de style
import '@egen-civitas/tailwind-preset/tailwind.tw.css';
```

## Surcharger un composant du framework (SCSS) avec Tailwind

Voir le commentaire en tête de `tailwind.tw.css` : utiliser le modificateur `!` de Tailwind v4 (`bg-primary-500!`) uniquement quand la classe doit surcharger un style SCSS existant sur le même élément (le SCSS du framework n'est pas dans un `@layer`, donc une classe Tailwind normale ne le bat pas). Pas nécessaire sur tes propres composants qui ne partagent pas de sélecteur avec `esm-styleguide`.
