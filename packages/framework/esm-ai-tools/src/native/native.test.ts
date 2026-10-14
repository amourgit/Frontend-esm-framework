import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { navigateTool, clickElementTool, fillFieldTool, describeScreenTool, listObservablesTool, switchTenantTool, inspectElementTool, inspectInterfaceTool, navigateAndInspectTool, downloadFileTool, fetchDataTool, searchTool } from './index';
import { egenFetch } from '@egen-civitas/esm-api';
import { registerUIAction, _clearUIActionRegistry } from '../ui-actions';
import { registerObservable, _clearObservableRegistry } from '../observables';

const mockNavigate = vi.fn();

vi.mock('@egen-civitas/esm-navigation', () => ({
  navigate: (...args: unknown[]) => mockNavigate(...args),
}));

vi.mock('@egen-civitas/esm-styleguide', () => ({
  showNotification: vi.fn(),
  showSnackbar: vi.fn(),
  showModal: vi.fn(),
}));

vi.mock('@egen-civitas/esm-api', () => ({
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

  it('laisse inchangée une URL absolue de la MÊME origine', async () => {
    mockNavigate.mockClear();
    const url = `${window.location.origin}/egen-civitas/spa/page`;

    const result = await navigateTool.execute({ args: { route: url } } as any);

    expect(result.success).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith({ to: url });
  });

  // Le backend (donc un contenu non fiable) pilote ce tool : jamais de sortie du site.
  it.each([
    ['site externe', 'https://evil.example.com/phish'],
    ['schéma javascript:', 'javascript:alert(1)'],
    ['schéma data:', 'data:text/html,<script>alert(1)</script>'],
    ['route vide', '   '],
  ])('refuse %s', async (_label, route) => {
    mockNavigate.mockClear();
    const result = await navigateTool.execute({ args: { route } } as any);
    expect(result.success).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("une route protocole-relative reste sous la base SPA (pas d'ouverture vers un autre hôte)", async () => {
    mockNavigate.mockClear();
    await navigateTool.execute({ args: { route: '//evil.example.com' } } as any);
    expect(mockNavigate).toHaveBeenCalledWith({ to: '${egenSpaBase}//evil.example.com' });
  });
});

describe('downloadFileTool', () => {
  it.each([
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html;base64,PHNjcmlwdD4='],
  ])('refuse une URL %s (exécutée au clic)', async (_l, url) => {
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const result = await downloadFileTool.execute({ args: { url, filename: 'a.txt' } } as any);
    expect(result.success).toBe(false);
    expect(clicked).not.toHaveBeenCalled();
    clicked.mockRestore();
  });

  it('assainit le nom de fichier et rejette un contenu non base64', async () => {
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const ok = await downloadFileTool.execute({
      args: { content: 'SGVsbG8=', filename: '../../etc/passwd', mimeType: 'text/plain' },
    } as any);
    expect(ok.success).toBe(true);
    expect((ok.data as any).filename).not.toMatch(/[\\/]/);
    const bad = await downloadFileTool.execute({ args: { content: 'pas du base64!', filename: 'a.txt' } } as any);
    expect(bad.success).toBe(false);
    clicked.mockRestore();
  });
});

describe('fetchDataTool', () => {
  beforeEach(() => vi.mocked(egenFetch).mockReset());

  it.each(['https://evil.example.com/x', 'http://evil.example.com', '//evil.example.com', 'ws/rest/v1/student', '/ws/../admin', '/ws/%2e%2e/admin', '/a\\b'])(
    "refuse l'endpoint %s (egenFetch enverrait les credentials hors de l'API)",
    async (endpoint) => {
      const result = await fetchDataTool.execute({ args: { endpoint } } as any);
      expect(result.success).toBe(false);
      expect(egenFetch).not.toHaveBeenCalled();
    },
  );

  it('accepte un chemin API relatif et fusionne les query params', async () => {
    vi.mocked(egenFetch).mockResolvedValue({ data: { ok: 1 } } as any);
    const result = await fetchDataTool.execute({
      args: { endpoint: '/ws/rest/v1/student?limit=20', queryParams: { page: 2 } },
    } as any);
    expect(result).toMatchObject({ success: true, data: { ok: 1 } });
    expect(egenFetch).toHaveBeenCalledWith('/ws/rest/v1/student?limit=20&page=2');
  });
});

describe('searchTool', () => {
  afterEach(() => {
    delete (window as any).getEgenSpaBase;
  });

  it('construit une route sous la base SPA, avec un seul slash', async () => {
    mockNavigate.mockClear();
    (window as any).getEgenSpaBase = () => '/egen-civitas/spa/';
    await searchTool.execute({ args: { query: 'élève Ndong', category: 'students' } } as any);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/egen-civitas/spa/search?q=%C3%A9l%C3%A8ve%20Ndong&category=students',
    });
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
  // @egen-civitas/esm-tenant (source unique de vérité, voir utils/domain-utils.ts).
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
    const { setupTenantSystem } = await import('@egen-civitas/esm-tenant');
    setupTenantSystem({ mode: 'multi', rootDomain: 'egen.gabon.gov.ga' });
    // Hostname à 2 segments seulement ("gov.ga" à la fin) : l'heuristique
    // best-effort (retirer le 1er label) découperait mal un TLD à plusieurs
    // niveaux. Avec le rootDomain explicite, le résultat reste correct.
    setHostname('mef.egen.gabon.gov.ga');

    const result = await switchTenantTool.execute({ args: { tenantSlug: 'lycee-lb' } } as any);

    expect(result.success).toBe(true);
    expect((result.data as any).targetUrl).toBe('https://lycee-lb.egen.gabon.gov.ga/');
  });

  it.each(['x.evil.com', 'evil.com#', 'a/b', '-bad', 'bad-', 'a b', ''])(
    'refuse le slug %j (sous-domaine construit → redirection hors du domaine racine)',
    async (tenantSlug) => {
      setHostname('app.gov.ga');
      const result = await switchTenantTool.execute({ args: { tenantSlug } } as any);
      expect(result.success).toBe(false);
    },
  );

  it("retombe sur l'heuristique (retire le 1er label) si aucun rootDomain n'est configuré", async () => {
    const { setupTenantSystem } = await import('@egen-civitas/esm-tenant');
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
