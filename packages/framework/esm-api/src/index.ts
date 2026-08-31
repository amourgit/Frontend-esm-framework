export * from './current-user.js';
export * from './environment.js';
export * from './egen-backend-dependencies.js';
export * from './egen-fetch.js';
export * from './setup.js';
export * from './types/index.js';

// Accès synchrone (non-React) au tenant actif — lit le store global "tenant"
// sans dépendance runtime sur @egen-civitas/esm-tenant (voir src/tenant.ts pour le
// détail). Utilisé par egenFetch (injection X-Tenant-ID) ET par
// @egen-civitas/esm-ai-context (construction du contexte IA) — c'est le point
// d'accès canonique pour tout code non-React ayant besoin du tenant actif.
// Pour du code React, préférer les hooks de @egen-civitas/esm-tenant (useTenant...).
export { getTenantId, tenantHeaders, isMultiTenant, subscribeTenant } from './tenant.js';

export { isDevAuthBypassEnabled, initDevAuthBypass, applyDevAuthBypassForLogin, interceptSessionFetch } from './dev-auth-bypass.js';

export * from './middleware.js';
export * from './retry-middleware.js';
export * from './problem-details.js';
