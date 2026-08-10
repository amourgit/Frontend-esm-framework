// ============================================================================
//  Tests — Orchestrateur setupTenantSystem (modèle capture-only, sans registry)
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { setupTenantSystem, switchTenant, recaptureTenant } from '../setup';
import { resetTenantStore, getTenantStoreState } from '../context/store';

function setHostname(hostname: string) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, hostname, pathname: '/', search: '' },
    writable: true,
  });
}

beforeEach(() => {
  resetTenantStore();
  localStorage.clear();
  setHostname('localhost');
  delete (window as any).egenTenantMode;
  delete (window as any).egenTenantId;
});

describe('setupTenantSystem — mode "off"', () => {
  it('ne capture rien et laisse le status à "off"', () => {
    setupTenantSystem({ mode: 'off' });
    const state = getTenantStoreState();
    expect(state.mode).toBe('off');
    expect(state.tenantId).toBeNull();
    expect(state.status).toBe('off');
  });

  it('est le mode par défaut si rien n\'est fourni ni configuré via window', () => {
    setupTenantSystem();
    expect(getTenantStoreState().mode).toBe('off');
  });
});

describe('setupTenantSystem — mode "single"', () => {
  it('active le tenant défini par defaultTenantId, sans aucune vérification', () => {
    setupTenantSystem({ mode: 'single', defaultTenantId: 'civitas' });
    const state = getTenantStoreState();
    expect(state.tenantId).toBe('civitas');
    expect(state.status).toBe('active');
    expect(state.source).toBe('static');
  });

  it('reste "idle" si defaultTenantId absent', () => {
    setupTenantSystem({ mode: 'single' });
    const state = getTenantStoreState();
    expect(state.tenantId).toBeNull();
    expect(state.status).toBe('idle');
  });
});

describe('setupTenantSystem — mode "multi"', () => {
  it('capture depuis le sous-domaine de l\'URL, sans vérification contre une liste connue', () => {
    setHostname('acme.egen.gabon.gov.ga');
    setupTenantSystem({ mode: 'multi', rootDomain: 'egen.gabon.gov.ga' });
    const state = getTenantStoreState();
    expect(state.tenantId).toBe('acme');
    expect(state.status).toBe('active');
    expect(state.source).toBe('subdomain');
  });

  it('reste "idle" (pas "error") quand aucune stratégie ne trouve de valeur', () => {
    setHostname('egen.gabon.gov.ga'); // domaine racine, pas de sous-domaine
    setupTenantSystem({ mode: 'multi', rootDomain: 'egen.gabon.gov.ga' });
    const state = getTenantStoreState();
    expect(state.tenantId).toBeNull();
    expect(state.status).toBe('idle');
    expect(state.mode).toBe('multi'); // le système reste actif, juste sans tenant capturé
  });

  it("100% synchrone : aucune promesse, aucun accès réseau requis pour capturer", () => {
    setHostname('mef.egen.gabon.gov.ga');
    const result = setupTenantSystem({ mode: 'multi', rootDomain: 'egen.gabon.gov.ga' });
    expect(result).toBeUndefined(); // fonction void, pas de Promise
    // La capture est déjà effective immédiatement après l'appel, sans await :
    expect(getTenantStoreState().tenantId).toBe('mef');
  });

  it('est idempotent : un rootDomain omis lors d\'un second appel efface bien le premier (pas d\'accumulation silencieuse)', () => {
    // Régression trouvée le 9 août 2026 en testant switch_tenant : avant
    // correctif, setTenantConfig() FUSIONNAIT la nouvelle config avec
    // l'ancienne (`{ ...s.config, ...config }`), donc un champ optionnel
    // omis au second appel restait figé à sa valeur du premier appel au
    // lieu d'être effacé — cassant l'idempotence de setupTenantSystem().
    setupTenantSystem({ mode: 'multi', rootDomain: 'egen.gabon.gov.ga' });
    expect(getTenantStoreState().config.rootDomain).toBe('egen.gabon.gov.ga');

    setupTenantSystem({ mode: 'multi' }); // pas de rootDomain cette fois
    expect(getTenantStoreState().config.rootDomain).toBeUndefined();
  });
});

describe('setupTenantSystem — résolution depuis window.egenTenant* (pont env)', () => {
  it('lit window.egenTenantMode / window.egenTenantId (pont EGEN_TENANT_* → window)', () => {
    (window as any).egenTenantMode = 'single';
    (window as any).egenTenantId = 'from-env';
    setupTenantSystem();
    const state = getTenantStoreState();
    expect(state.mode).toBe('single');
    expect(state.tenantId).toBe('from-env');
  });

  it('la config explicite passée à setupTenantSystem() est prioritaire sur window', () => {
    (window as any).egenTenantMode = 'single';
    (window as any).egenTenantId = 'from-env';
    setupTenantSystem({ defaultTenantId: 'from-explicit-config' });
    expect(getTenantStoreState().tenantId).toBe('from-explicit-config');
  });
});

describe('switchTenant', () => {
  it('change le tenant actif sans aucune vérification (mode multi)', () => {
    setupTenantSystem({ mode: 'multi' });
    switchTenant('nouveau-tenant');
    const state = getTenantStoreState();
    expect(state.tenantId).toBe('nouveau-tenant');
    expect(state.status).toBe('active');
  });

  it('accepte null pour effacer le tenant actif', () => {
    setupTenantSystem({ mode: 'multi', defaultTenantId: 'x' });
    switchTenant('x');
    switchTenant(null);
    const state = getTenantStoreState();
    expect(state.tenantId).toBeNull();
    expect(state.status).toBe('idle');
  });

  it('est ignoré en mode "off"', () => {
    setupTenantSystem({ mode: 'off' });
    switchTenant('acme');
    expect(getTenantStoreState().tenantId).toBeNull();
  });

  it('est ignoré en mode "single"', () => {
    setupTenantSystem({ mode: 'single', defaultTenantId: 'civitas' });
    switchTenant('autre-tenant');
    expect(getTenantStoreState().tenantId).toBe('civitas');
  });
});

describe('recaptureTenant', () => {
  it("relit les sources (ex: après un changement d'URL programmatique)", () => {
    setHostname('egen.gabon.gov.ga');
    setupTenantSystem({ mode: 'multi', rootDomain: 'egen.gabon.gov.ga' });
    expect(getTenantStoreState().tenantId).toBeNull();

    setHostname('acme.egen.gabon.gov.ga');
    recaptureTenant();
    expect(getTenantStoreState().tenantId).toBe('acme');
  });
});

describe('persistance localStorage', () => {
  it('persiste le tenant capturé si persistActive !== false', () => {
    setHostname('acme.egen.gabon.gov.ga');
    setupTenantSystem({ mode: 'multi', rootDomain: 'egen.gabon.gov.ga', storageKey: 'test:tenant' });
    expect(localStorage.getItem('test:tenant')).toBe('acme');
  });

  it('ne persiste rien si persistActive === false', () => {
    setHostname('acme.egen.gabon.gov.ga');
    setupTenantSystem({
      mode: 'multi',
      rootDomain: 'egen.gabon.gov.ga',
      persistActive: false,
      storageKey: 'test:tenant',
    });
    expect(localStorage.getItem('test:tenant')).toBeNull();
  });
});

describe('onTenantChange callback', () => {
  it('est appelé lors de la capture initiale avec le tenantId et la stratégie', () => {
    setHostname('acme.egen.gabon.gov.ga');
    let received: unknown;
    setupTenantSystem({
      mode: 'multi',
      rootDomain: 'egen.gabon.gov.ga',
      onTenantChange: (tenantId, source) => {
        received = { tenantId, source };
      },
    });
    expect(received).toEqual({ tenantId: 'acme', source: 'subdomain' });
  });

  it("n'est PAS rappelé si le tenant ne change pas", () => {
    setupTenantSystem({ mode: 'single', defaultTenantId: 'x' });
    let calls = 0;
    setupTenantSystem({ mode: 'single', defaultTenantId: 'x', onTenantChange: () => calls++ });
    // Le tenant "x" était déjà actif avant cet appel -> pas de nouveau changement
    expect(calls).toBe(0);
  });
});
