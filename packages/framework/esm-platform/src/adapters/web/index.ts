/**
 * Capacités fournies par le navigateur. PRINCIPE (doc C4) : ne jamais simuler de la sécurité.
 *
 * La liste de ce qui est fourni ne vit plus ici : chaque capacité déclare son adaptateur Web dans `registry.ts`
 * (tâche C6), et `createWebCapabilities()` ne fait que lire le registre. Sont ABSENTES (`has()` faux, méthodes
 * `UNAVAILABLE`) : `secureStorage` (pas de faux coffre dans `localStorage`), `push` et `biometric` (v1), ainsi que
 * `permissions` quand l'API Permissions n'existe pas.
 */
export { createWebCapabilities } from '../../registry.js';
