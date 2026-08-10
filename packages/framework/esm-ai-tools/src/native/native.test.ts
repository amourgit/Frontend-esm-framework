import { describe, it, expect, vi, beforeEach } from 'vitest';
import { navigateTool, clickElementTool, fillFieldTool, describeScreenTool, listObservablesTool, switchTenantTool, inspectElementTool, inspectInterfaceTool, navigateAndInspectTool } from './index';
import { registerUIAction, _clearUIActionRegistry } from '../ui-actions';
import { registerObservable, _clearObservableRegistry } from '../observables';

const mockNavigate = vi.fn();

vi.mock('@egen/esm-navigation', () => ({
  navigate: (...args: unknown[]) => mockNavigate(...args),
}));

vi.mock('@egen/esm-styleguide/src/public', () => ({
  showNotification: vi.fn(),
  showSnackbar: vi.fn(),
  showModal: vi.fn(),
}));

vi.mock('@egen/esm-api', () => ({
  egenFetch: vi.fn(),
}));

describe('navigateTool', () => {
  it('préfixe une route logique avec ${egenSpaBase} pour déclencher une vraie navigation SPA', async () => {
    mockNavigate.mockClear();

    await navigateTool.execute({ args: { route: '/login' } } as any);

    expect(mockNavigate).toHaveBeenCalledWith({ to: '${egenSpaBase}/login' });
  });

  it('ne double pas le préfixe si le LLM le fournit déjà', async () => {
    mockNavigate.mockClear();

    await navigateTool.execute({ args: { route: '${egenSpaBase}/home' } } as any);

    expect(mockNavigate).toHaveBeenCalledWith({ to: '${egenSpaBase}/home' });
  });

  it('laisse une URL absolue inchangée', async () => {
    mockNavigate.mockClear();

    await navigateTool.execute({ args: { route: 'https://example.com/page' } } as any);

    expect(mockNavigate).toHaveBeenCalledWith({ to: 'https://example.com/page' });
  });
});

describe('clickElementTool', () => {
  beforeEach(() => {
    _clearUIActionRegistry();
    document.body.innerHTML = '';
  });

  it('clique sur un élément enregistré et visible', async () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    let clicked = false;
    button.addEventListener('click', () => (clicked = true));
    registerUIAction({ id: 'submit-btn', kind: 'click', label: 'Valider', description: '...' }, button);

    const result = await clickElementTool.execute({ args: { actionId: 'submit-btn' } } as any);

    expect(clicked).toBe(true);
    expect(result.success).toBe(true);
  });

  it("échoue proprement si l'id ne correspond à rien de visible — jamais deviné", async () => {
    const result = await clickElementTool.execute({ args: { actionId: 'inexistant' } } as any);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/inexistant/);
  });
});

describe('fillFieldTool', () => {
  beforeEach(() => {
    _clearUIActionRegistry();
    document.body.innerHTML = '';
  });

  it('renseigne la valeur d’un champ enregistré et déclenche son évènement input', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    let changedValue = '';
    input.addEventListener('input', (e) => (changedValue = (e.target as HTMLInputElement).value));
    registerUIAction({ id: 'new-password', kind: 'fill', label: 'Nouveau mot de passe', description: '...' }, input);

    const result = await fillFieldTool.execute({ args: { actionId: 'new-password', value: 'S3cret!' } } as any);

    expect(result.success).toBe(true);
    expect(input.value).toBe('S3cret!');
    expect(changedValue).toBe('S3cret!');
  });

  it("échoue proprement si l'élément n'est pas un champ de formulaire", async () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    registerUIAction({ id: 'not-a-field', kind: 'fill', label: '...', description: '...' }, div);

    const result = await fillFieldTool.execute({ args: { actionId: 'not-a-field', value: 'x' } } as any);

    expect(result.success).toBe(false);
  });
});

describe('listObservablesTool', () => {
  beforeEach(() => {
    _clearObservableRegistry();
    document.body.innerHTML = '';
  });

  it('retourne le catalogue courant des observables visibles', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    registerObservable(
      { id: 'summary', kind: 'card', label: 'Résumé', description: '...', getData: () => ({ total: 3 }) },
      el,
    );

    const result = await listObservablesTool.execute({ args: {} } as any);

    expect(result.success).toBe(true);
    expect((result.data as any).observables).toEqual([expect.objectContaining({ id: 'summary' })]);
  });
});

describe('describeScreenTool', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it("décrit l'écran courant sans lever d'exception", async () => {
    const heading = document.createElement('h1');
    heading.textContent = 'Accueil';
    document.body.appendChild(heading);

    const result = await describeScreenTool.execute({ args: {} } as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('headings');
    expect(result.data).toHaveProperty('interactiveElements');
  });
});

describe('switchTenantTool', () => {
  // Régression : ce tool réimplémentait sa propre extraction de domaine
  // racine au lieu de réutiliser inferRootDomain/buildTenantSubdomainUrl de
  // @egen/esm-tenant (source unique de vérité, voir utils/domain-utils.ts).
  // Conséquence concrète du bug : un EGEN_TENANT_ROOT_DOMAIN configuré
  // explicitement (nécessaire sur les TLD à plusieurs niveaux, ex: "gov.ga")
  // était totalement ignoré par ce tool.
  function setHostname(hostname: string) {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hostname, protocol: 'https:', port: '' },
      writable: true,
    });
  }

  it('utilise le rootDomain explicitement configuré (setupTenantSystem) plutôt que l\'heuristique', async () => {
    const { setupTenantSystem } = await import('@egen/esm-tenant');
    setupTenantSystem({ mode: 'multi', rootDomain: 'egen.gabon.gov.ga' });
    // Hostname à 2 segments seulement ("gov.ga" à la fin) : l'heuristique
    // best-effort (retirer le 1er label) découperait mal un TLD à plusieurs
    // niveaux. Avec le rootDomain explicite, le résultat reste correct.
    setHostname('mef.egen.gabon.gov.ga');

    const result = await switchTenantTool.execute({ args: { tenantSlug: 'lycee-lb' } } as any);

    expect(result.success).toBe(true);
    expect((result.data as any).targetUrl).toBe('https://lycee-lb.egen.gabon.gov.ga/');
  });

  it("retombe sur l'heuristique (retire le 1er label) si aucun rootDomain n'est configuré", async () => {
    const { setupTenantSystem } = await import('@egen/esm-tenant');
    setupTenantSystem({ mode: 'multi' }); // pas de rootDomain
    setHostname('mef.egen-demo.com');

    const result = await switchTenantTool.execute({ args: { tenantSlug: 'lycee-lb' } } as any);

    expect(result.success).toBe(true);
    expect((result.data as any).targetUrl).toBe('https://lycee-lb.egen-demo.com/');
  });
});

describe('inspectElementTool', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _clearUIActionRegistry();
    _clearObservableRegistry();
  });

  it('résout par actionId (élément enregistré via useAIActionable)', async () => {
    const el = document.createElement('button');
    el.textContent = 'Valider';
    document.body.appendChild(el);
    registerUIAction({ id: 'demo:submit', kind: 'click', label: 'Valider', description: 'Soumet le formulaire.' }, el);

    const result = await inspectElementTool.execute({ args: { actionId: 'demo:submit' } } as any);

    expect(result.success).toBe(true);
    expect((result.data as any).identity.tagName).toBe('button');
    expect((result.data as any).declaredMetadata.registeredAction.id).toBe('demo:submit');
  });

  it('résout par selector CSS quand aucun actionId ne correspond', async () => {
    document.body.innerHTML = `<div class="pricing-card" id="card-1"></div>`;

    const result = await inspectElementTool.execute({ args: { selector: '.pricing-card' } } as any);

    expect(result.success).toBe(true);
    expect((result.data as any).identity.id).toBe('card-1');
  });

  it('utilise matchIndex pour désambiguïser plusieurs correspondances', async () => {
    document.body.innerHTML = `<div class="item" id="item-0"></div><div class="item" id="item-1"></div>`;

    const result = await inspectElementTool.execute({ args: { selector: '.item', matchIndex: 1 } } as any);

    expect(result.success).toBe(true);
    expect((result.data as any).identity.id).toBe('item-1');
  });

  it('échoue proprement si ni actionId ni selector ne sont fournis', async () => {
    const result = await inspectElementTool.execute({ args: {} } as any);
    expect(result.success).toBe(false);
  });

  it('échoue proprement si le selector ne matche rien', async () => {
    document.body.innerHTML = '';
    const result = await inspectElementTool.execute({ args: { selector: '.introuvable' } } as any);
    expect(result.success).toBe(false);
    expect(result.error).toContain('introuvable');
  });
});

describe('inspectInterfaceTool', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it("inspecte l'ensemble de l'écran courant", async () => {
    document.body.innerHTML = `<h1>Titre</h1><button id="a">Action</button>`;
    const result = await inspectInterfaceTool.execute({ args: {} } as any);

    expect(result.success).toBe(true);
    const tags = (result.data as any).nodes.map((n: any) => n.identity.tagName);
    expect(tags).toContain('h1');
    expect(tags).toContain('button');
  });

  it('respecte rootSelector pour scoper à une sous-partie de l\'écran', async () => {
    document.body.innerHTML = `<div id="a"><button id="btn-a">x</button></div><div id="b"><button id="btn-b">y</button></div>`;
    const result = await inspectInterfaceTool.execute({ args: { rootSelector: '#a' } } as any);

    const ids = (result.data as any).nodes.map((n: any) => n.identity.id);
    expect(ids).toContain('btn-a');
    expect(ids).not.toContain('btn-b');
  });
});

describe('navigateAndInspectTool', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="existing">déjà là</button>';
    mockNavigate.mockClear();
  });

  it('navigue vers la route résolue puis retourne un rapport d\'interface', async () => {
    const result = await navigateAndInspectTool.execute({ args: { route: '/students' } } as any);

    expect(mockNavigate).toHaveBeenCalledWith({ to: '${egenSpaBase}/students' });
    expect(result.success).toBe(true);
    expect((result.data as any).navigatedTo).toBe('${egenSpaBase}/students');
    expect((result.data as any).nodes.length).toBeGreaterThan(0);
  }, 10000);
});
