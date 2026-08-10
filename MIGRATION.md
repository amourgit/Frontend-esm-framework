# Guide de Migration — Consommer @egen/esm-framework dans un Projet Externe

Ce document explique comment extraire une application ou un projet métier existant (ou en créer un nouveau) pour consommer le framework `@egen/esm-framework` isolé.

---

## 1. Vue d'ensemble de la séparation

```
Avant (Monorepo tout-en-un) :
[ Frontend-esm-core ]
 ├── packages/framework/*  (dépendances workspace:*)
 ├── packages/tooling/*    (dépendances workspace:*)
 ├── packages/shell/*
 └── packages/apps/*       (apps métier)

Après (Architecture isolée & réutilisable) :
[ Framework Standalone ] (Nouveau repo : Frontend-esm-framework)
 ├── Publié sur NPM sous le scope @egen/* (@egen/esm-framework, @egen/esm-theme, @egen/esm-styleguide, egen CLI, etc.)

[ Projet Consommateur ] (Ex: Frontend-esm-core ou NouveauProjet)
 ├── Dépendances NPM : "@egen/esm-framework": "^9.0.2", "egen": "^9.0.2"
 ├── packages/shell/  (copié depuis le template esm-app-shell)
 └── packages/apps/*  (uniquement tes micro-frontends métier)
```

---

## 2. Configurer un nouveau projet consommateur

### Étape 1 : Structure initiale du projet
Crée un nouveau répertoire pour ton projet métier :

```bash
mkdir Mon-Projet-App && cd Mon-Projet-App
yarn init
```

### Étape 2 : Configurer `package.json` à la racine
Exemple de `package.json` minimal pour un monorepo consommateur :

```json
{
  "name": "@mon-entreprise/mon-projet",
  "version": "1.0.0",
  "private": true,
  "packageManager": "yarn@4.10.3",
  "workspaces": [
    "packages/shell/*",
    "packages/apps/*"
  ],
  "scripts": {
    "start": "egen develop --sources \"packages/apps/*\"",
    "build": "turbo run build",
    "build:apps": "turbo run build --filter='*-app'",
    "verify": "turbo run lint test typescript"
  },
  "devDependencies": {
    "@egen/esm-framework": "^9.0.2",
    "@egen/esm-theme": "^9.0.2",
    "@egen/esm-styleguide": "^9.0.2",
    "egen": "^9.0.2",
    "turbo": "^2.5.2",
    "typescript": "^5.8.3"
  }
}
```

### Étape 3 : Copier et personnaliser le Shell
Copie le package `packages/shell/esm-app-shell` du repo framework vers `packages/shell/esm-app-shell` de ton projet.

### Étape 4 : Développer des micro-frontends métier dans `packages/apps/`
Chaque app métier dans `packages/apps/mon-app-1` importera le framework depuis NPM :

```tsx
import React from 'react';
import { useConfig, useSession } from '@egen/esm-framework';
import { Button } from '@egen/esm-styleguide';

export function MonComposant() {
  const config = useConfig();
  const session = useSession();

  return (
    <div>
      <h1>Bienvenue sur Mon App</h1>
      <Button onClick={() => alert('Action')}>Cliquer ici</Button>
    </div>
  );
}
```

---

## 3. Avantages de cette architecture

1. **Isolation stricte** : Le framework évolue de manière autonome sans risquer de casser des projets métier spécifiques.
2. **Réutilisabilité multi-projets** : Plusieurs équipes ou projets peuvent partager le même core framework via NPM.
3. **Mise à jour simplifiée** : Une mise à jour du framework se fait simplement via `yarn update @egen/esm-framework`.
4. **Standardisation UI/UX** : Le thème dynamique (`@egen/esm-theme`) et le styleguide (`@egen/esm-styleguide`) garantissent une cohérence visuelle parfaite.
