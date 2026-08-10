import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveActiveTenantId, persistActiveTenant, clearPersistedTenant, storeHeaderTenantId } from '../context/resolver';

// =============================================================================
//  RESOLVER — Tests de la capture brute du tenant (aucune vérification de
//  validité : chaque stratégie doit retourner exactement ce qu'elle trouve).
// =============================================================================

function setHostname(hostname: string) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, hostname, pathname: '/', search: '' },
    writable: true,
  });
}

beforeEach(() => {
  window.localStorage.clear();
  setHostname('localhost');
});

describe('resolveActiveTenantId — subdomain', () => {
  it('capture le premier label du hostname par rapport au rootDomain', () => {
    setHostname('mef.egen.gabon.gov.ga');
    const result = resolveActiveTenantId({
      mode: 'multi',
      resolutionOrder: ['subdomain'],
      rootDomain: 'egen.gabon.gov.ga',
    });
    expect(result).toEqual({ tenantId: 'mef', source: 'subdomain' });
  });

  it('ne retourne rien sur le domaine racine seul (pas de sous-domaine)', () => {
    setHostname('egen.gabon.gov.ga');
    const result = resolveActiveTenantId({
      mode: 'multi',
      resolutionOrder: ['subdomain'],
      rootDomain: 'egen.gabon.gov.ga',
    });
    expect(result).toBeUndefined();
  });

  it('ne fait AUCUNE vérification : un sous-domaine "inventé" est capturé tel quel', () => {
    setHostname('nimporte-quoi.egen.gabon.gov.ga');
    const result = resolveActiveTenantId({
      mode: 'multi',
      resolutionOrder: ['subdomain'],
      rootDomain: 'egen.gabon.gov.ga',
    });
    expect(result).toEqual({ tenantId: 'nimporte-quoi', source: 'subdomain' });
  });

  it('ignore localhost (pas de tenant en dev sans sous-domaine réel)', () => {
    setHostname('localhost');
    const result = resolveActiveTenantId({ mode: 'multi', resolutionOrder: ['subdomain'] });
    expect(result).toBeUndefined();
  });

  it(
    'capture le sous-domaine sur *.localhost sans configuration explicite (RFC 6761) — ' +
      'régression du 9 août 2026 : "civitas.localhost" retournait undefined',
    () => {
      setHostname('civitas.localhost');
      const result = resolveActiveTenantId({ mode: 'multi', resolutionOrder: ['subdomain'] });
      expect(result).toEqual({ tenantId: 'civitas', source: 'subdomain' });
    },
  );

  it(
    'cas exact du bug rapporté : rootDomain de prod configuré par erreur pour du dev en ' +
      '*.localhost → aucune capture possible (à corriger côté config, pas côté résolveur)',
    () => {
      setHostname('civitas.localhost');
      const result = resolveActiveTenantId({
        mode: 'multi',
        resolutionOrder: ['subdomain'],
        rootDomain: 'egen.gabon.gov.ga', // mauvaise config pour ce hostname
      });
      expect(result).toBeUndefined();
    },
  );
});

describe('resolveActiveTenantId — path', () => {
  it('capture le segment après le préfixe configuré', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hostname: 'localhost', pathname: '/t/acme/dashboard', search: '' },
      writable: true,
    });
    const result = resolveActiveTenantId({
      mode: 'multi',
      resolutionOrder: ['path'],
      pathConfig: { prefix: '/t/' },
    });
    expect(result).toEqual({ tenantId: 'acme', source: 'path' });
  });

  it(
    'ne capture RIEN sans préfixe configuré — régression du 9 août 2026 : deviner le ' +
      'premier segment confondait le SPA base ("/egen/spa/home" → "egen") avec un tenant',
    () => {
      Object.defineProperty(window, 'location', {
        value: { ...window.location, hostname: 'localhost', pathname: '/egen/spa/home', search: '' },
        writable: true,
      });
      const result = resolveActiveTenantId({ mode: 'multi', resolutionOrder: ['path'] });
      expect(result).toBeUndefined();
    },
  );
});

describe('resolveActiveTenantId — query', () => {
  it('capture ?tenant=', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hostname: 'localhost', pathname: '/', search: '?tenant=acme' },
      writable: true,
    });
    const result = resolveActiveTenantId({ mode: 'multi', resolutionOrder: ['query'] });
    expect(result).toEqual({ tenantId: 'acme', source: 'query' });
  });
});

describe('resolveActiveTenantId — localStorage / header', () => {
  it('capture la valeur persistée en localStorage', () => {
    persistActiveTenant('acme', 'egen:tenant:active');
    const result = resolveActiveTenantId({ mode: 'multi', resolutionOrder: ['localStorage'] });
    expect(result).toEqual({ tenantId: 'acme', source: 'localStorage' });
  });

  it('clearPersistedTenant efface la valeur persistée', () => {
    persistActiveTenant('acme', 'egen:tenant:active');
    clearPersistedTenant('egen:tenant:active');
    const result = resolveActiveTenantId({ mode: 'multi', resolutionOrder: ['localStorage'] });
    expect(result).toBeUndefined();
  });

  it('storeHeaderTenantId puis stratégie "header" la relit', () => {
    storeHeaderTenantId('acme', 'egen:tenant:active');
    const result = resolveActiveTenantId({ mode: 'multi', resolutionOrder: ['header'] });
    expect(result).toEqual({ tenantId: 'acme', source: 'header' });
  });
});

describe('resolveActiveTenantId — static', () => {
  it('capture window.egenTenantId', () => {
    (window as any).egenTenantId = 'acme';
    const result = resolveActiveTenantId({ mode: 'multi', resolutionOrder: ['static'] });
    expect(result).toEqual({ tenantId: 'acme', source: 'static' });
    delete (window as any).egenTenantId;
  });

  it('defaultTenantId de la config a priorité sur window.egenTenantId', () => {
    (window as any).egenTenantId = 'from-window';
    const result = resolveActiveTenantId({ mode: 'multi', resolutionOrder: ['static'], defaultTenantId: 'from-config' });
    expect(result).toEqual({ tenantId: 'from-config', source: 'static' });
    delete (window as any).egenTenantId;
  });
});

describe('resolveActiveTenantId — jwt', () => {
  it('extrait le claim configuré du JWT stocké', () => {
    const payload = btoa(JSON.stringify({ tenantId: 'acme' }));
    window.localStorage.setItem('egen:session:token', `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`);
    const result = resolveActiveTenantId({
      mode: 'multi',
      resolutionOrder: ['jwt'],
      jwtConfig: { claim: 'tenantId' },
    });
    expect(result).toEqual({ tenantId: 'acme', source: 'jwt' });
  });

  it('retourne undefined si aucun token présent', () => {
    const result = resolveActiveTenantId({ mode: 'multi', resolutionOrder: ['jwt'] });
    expect(result).toBeUndefined();
  });
});

describe('resolveActiveTenantId — ordre de priorité', () => {
  it("respecte l'ordre : la première stratégie qui trouve une valeur gagne", () => {
    setHostname('mef.egen.gabon.gov.ga');
    persistActiveTenant('autre-tenant', 'egen:tenant:active');

    const result = resolveActiveTenantId({
      mode: 'multi',
      resolutionOrder: ['localStorage', 'subdomain'],
      rootDomain: 'egen.gabon.gov.ga',
    });

    expect(result).toEqual({ tenantId: 'autre-tenant', source: 'localStorage' });
  });

  it('passe à la stratégie suivante si la première ne trouve rien', () => {
    setHostname('egen.gabon.gov.ga'); // pas de sous-domaine
    persistActiveTenant('fallback-tenant', 'egen:tenant:active');

    const result = resolveActiveTenantId({
      mode: 'multi',
      resolutionOrder: ['subdomain', 'localStorage'],
      rootDomain: 'egen.gabon.gov.ga',
    });

    expect(result).toEqual({ tenantId: 'fallback-tenant', source: 'localStorage' });
  });

  it('retourne undefined si aucune stratégie ne trouve rien', () => {
    setHostname('egen.gabon.gov.ga');
    const result = resolveActiveTenantId({
      mode: 'multi',
      resolutionOrder: ['subdomain', 'query', 'localStorage'],
      rootDomain: 'egen.gabon.gov.ga',
    });
    expect(result).toBeUndefined();
  });
});
