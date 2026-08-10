export * from './current-user';
export * from './environment';
export * from './egen-backend-dependencies';
export * from './egen-fetch';
export * from './setup';
export * from './types';

// Accès synchrone (non-React) au tenant actif — lit le store global "tenant"
// sans dépendance runtime sur @egen/esm-tenant (voir src/tenant.ts pour le
// détail). Utilisé par egenFetch (injection X-Tenant-ID) ET par
// @egen/esm-ai-context (construction du contexte IA) — c'est le point
// d'accès canonique pour tout code non-React ayant besoin du tenant actif.
// Pour du code React, préférer les hooks de @egen/esm-tenant (useTenant...).
export { getTenantId, tenantHeaders, isMultiTenant, subscribeTenant } from './tenant';

export { isDevAuthBypassEnabled, initDevAuthBypass, applyDevAuthBypassForLogin, interceptSessionFetch } from './dev-auth-bypass';
