import { describe, it, expect, beforeEach } from 'vitest';
import { registerRoute, removeRoute, getAllRoutes, getRoutesCatalogForLLM, _clearRouteRegistry } from './routes';

describe('routes registry', () => {
  beforeEach(() => {
    _clearRouteRegistry();
  });

  it('enregistre et liste une route avec ses paramètres', () => {
    registerRoute({
      path: '/students/:id',
      description: "Fiche détaillée d'un étudiant.",
      params: [{ name: 'id', type: 'string', required: true, description: "UUID de l'étudiant" }],
    });

    expect(getAllRoutes()).toHaveLength(1);
    expect(getRoutesCatalogForLLM()).toEqual([
      {
        path: '/students/:id',
        description: "Fiche détaillée d'un étudiant.",
        params: [{ name: 'id', type: 'string', required: true, description: "UUID de l'étudiant" }],
      },
    ]);
  });

  it('retire une route enregistrée', () => {
    registerRoute({ path: '/login', description: 'Page de connexion.' });
    expect(getAllRoutes()).toHaveLength(1);

    removeRoute('/login');
    expect(getAllRoutes()).toHaveLength(0);
  });

  it('retourne un tableau params vide plutôt qu’undefined quand aucun paramètre n’est déclaré', () => {
    registerRoute({ path: '/home', description: "Page d'accueil." });
    expect(getRoutesCatalogForLLM()[0].params).toEqual([]);
  });
});
