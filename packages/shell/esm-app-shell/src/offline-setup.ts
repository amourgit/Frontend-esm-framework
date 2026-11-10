/**
 * Démarrage du mode hors ligne après le boot du shell (tâche E1).
 *
 * Deux choses distinctes, auparavant confondues :
 * - le SERVICE WORKER (cache des ressources, précache des dépendances statiques) : `window.serviceWorkerEnabled` ;
 * - les DONNÉES hors ligne (mode, synchronisation, UI sensible à la connectivité) : `window.offlineEnabled`, déjà
 *   garanti par l'appelant (ce module n'est lancé que si le mode hors ligne est actif).
 *
 * Une cible native embarque ses fichiers dans le binaire : pas de service worker, mais les données restent actives.
 */
export interface OfflineSetupDeps {
  serviceWorkerEnabled: boolean;
  registerServiceWorker(): Promise<unknown>;
  activateOfflineCapability(): Promise<unknown>;
  startStaticDependencyPrecaching(): void;
}

export async function setupOfflineMode(deps: OfflineSetupDeps): Promise<void> {
  if (deps.serviceWorkerEnabled) {
    await deps.registerServiceWorker();
  }

  await deps.activateOfflineCapability();

  // Le précache passe par le service worker : sans lui, il n'y a rien à précacher (les fichiers sont embarqués).
  if (deps.serviceWorkerEnabled) {
    deps.startStaticDependencyPrecaching();
  }
}
