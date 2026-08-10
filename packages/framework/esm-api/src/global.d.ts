// Déclarations minimales pour `process.env` utilisées dans le code frontend
// Evite d'ajouter @types/node au monorepo lorsque seul `process.env` est requis.
declare global {
  // On ne déclare que la forme minimale nécessaire : un objet `env` indexable.
  const process: {
    env: { [key: string]: string | undefined };
  };
}

export {};
