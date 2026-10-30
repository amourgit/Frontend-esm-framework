# Robot assistant 3D (EGEN)

Corps complet, articulé et animable, dont la tête reprend celle de `LiveOrb`.

## Qui fait quoi

| Fichier | Rôle |
| --- | --- |
| `skeleton.ts` | **Source unique** du corps : 37 articulations, parent, position, butées, pose de repos. |
| `clips.ts` / `gestures.ts` | Un geste = quelques poses clés. `gestures.ts` en contient 17 (salut, pointer, applaudir…). |
| `hands.ts` | Formes de main (ouverte, poing, index pointé, pouce levé…). |
| `ik.ts` | Cinématique inverse d'un bras : « mets ta main *là* ». |
| `controller.ts` | Le « cerveau » : gestes, marche, regard, clignement, états de l'assistant. Sans React ni WebGL. |
| `Robot.tsx` + `parts/` | Rendu : construit l'arbre d'articulations et dessine une pièce par articulation. |
| `RobotStage.tsx` | Canvas prêt à l'emploi (lumière studio, ombre, caméra, regard qui suit la souris). |
| `lazy.tsx` | Version chargée à la demande (`three` n'est téléchargé qu'à l'affichage). |

## Ordre d'une image

1. `controller.update(dt)` calcule les angles : repos → attitude de l'état → démarche → gestes → respiration/regard → butées → lissage.
2. `Robot` recopie ces angles sur les articulations et place le robot sur le sol.
3. Si une main a une cible (`pointAt`), `ik.ts` ajuste épaule et coude par-dessus.

## Exemple de bout en bout

```tsx
const controller = useMemo(() => new RobotController(), []);

<AssistantRobotScene controller={controller} state="speaking" speechLevel={0.4} />;

await controller.walkTo(1, 0.5);                       // marche jusqu'au point (1 m, 0,5 m)
await controller.play('wave');                         // salue (bras gauche)
await controller.play('wave', { side: 'R' });          // salue (bras droit)
controller.pointAt('L', controller.toRobotFrame(2, 1.2, 1)); // pointe un point de la scène
controller.pointAt('L', null);                         // relâche
```

## Ajouter un geste

Dans `gestures.ts`, décrire des clés `{ t, pose: { shoulderL: [x, y, z], … } }` (radians, conventions en tête de
`skeleton.ts`), l'ajouter à `GESTURE_LIBRARY` et à `GestureName`. Les tests vérifient automatiquement les butées.
Pour trouver des angles qui amènent la main à un point précis, utiliser `solveArmIK`.

## Ajouter une pièce de corps

Écrire le composant dans `parts/Body.tsx` (repère de l'articulation, y vers le bas du membre) et ajouter une ligne
dans `partFor` de `Robot.tsx`.
