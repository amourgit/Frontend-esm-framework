/**
 * @vitest-environment jsdom
 *
 * Régression du 8 août 2026 : buildTenantContext() lisait encore l'ancien
 * format du store tenant (activeTenant.id/name/locale/timezone/featureFlags)
 * après la refonte du système tenant vers un modèle "capture-only"
 * ({ tenantId, mode }, voir @egen/esm-tenant/src/types.ts). Le contexte IA
 * perdait alors silencieusement toute information de tenant, sans jamais
 * lever d'erreur (accès non typé sur `any`).
 *
 * Ces tests figent le contrat : buildAIContext().context.tenant reflète
 * fidèlement le store tenant global "tenant", accédé exclusivement via
 * l'API synchrone canonique de @egen/esm-api (getTenantId/isMultiTenant) —
 * jamais un accès direct/spéculatif à window.stores ou window.egenTenant*.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createGlobalStore } from '@egen/esm-state';
import { buildAIContext } from '.';

type FakeTenantState = { tenantId: string | null; mode: 'off' | 'single' | 'multi' };

// Simule le store tenant réel de @egen/esm-tenant (même nom "tenant", même
// forme d'état) SANS en dépendre — exactement comme le fait le code testé.
function setFakeTenantState(state: FakeTenantState) {
  const store = createGlobalStore<FakeTenantState>('tenant', state);
  store.setState(state);
  return store;
}

describe('buildAIContext — contexte tenant', () => {
  afterEach(() => {
    // Remet un store tenant neutre pour ne pas polluer les autres tests du fichier
    setFakeTenantState({ tenantId: null, mode: 'off' });
  });

  it('expose le tenant capturé (mode "multi")', () => {
    setFakeTenantState({ tenantId: 'mef-gabon', mode: 'multi' });

    const { context } = buildAIContext();

    expect(context.tenant).toEqual({ id: 'mef-gabon', mode: 'multi' });
  });

  it('expose le tenant capturé (mode "single")', () => {
    setFakeTenantState({ tenantId: 'civitas', mode: 'single' });

    const { context } = buildAIContext();

    expect(context.tenant).toEqual({ id: 'civitas', mode: 'single' });
  });

  it('retourne null si aucun tenant capturé (mode "multi" mais sous-domaine racine)', () => {
    setFakeTenantState({ tenantId: null, mode: 'multi' });

    const { context } = buildAIContext();

    expect(context.tenant).toBeNull();
  });

  it('retourne null en mode "off"', () => {
    setFakeTenantState({ tenantId: null, mode: 'off' });

    const { context } = buildAIContext();

    expect(context.tenant).toBeNull();
  });

  it("ne contient plus aucune métadonnée (name/locale/timezone/featureFlags) — capture-only", () => {
    setFakeTenantState({ tenantId: 'acme', mode: 'multi' });

    const { context } = buildAIContext();

    expect(context.tenant).toEqual({ id: 'acme', mode: 'multi' });
    expect(context.tenant).not.toHaveProperty('name');
    expect(context.tenant).not.toHaveProperty('locale');
    expect(context.tenant).not.toHaveProperty('timezone');
    expect(context.tenant).not.toHaveProperty('featureFlags');
  });
});
