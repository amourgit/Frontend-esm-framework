/**
 * Garde-fou des ponts `EGEN_*` (process.env, côté build) → `window.*` (navigateur).
 *
 * Tout ce qui passe par un pont est embarqué EN CLAIR dans le bundle et dans `index.html` : aucun secret ne doit
 * y figurer (règle N3). La liste blanche protège les NOMS, pas les VALEURS (celles-ci viennent des `.env` : à relire
 * dans le `dist` réellement déployé) ; ce garde-fou empêche au moins qu'un nom évoquant un secret soit ajouté à un pont.
 */

/** Noms évoquant un secret (insensible à la casse, sur le nom de variable ET sur le nom de la clé `window`). */
const FORBIDDEN_BRIDGE_KEY = /secret|private|passw(or)?d|token|api_?key|credential/i;

/**
 * Exceptions explicites et justifiées : un nom qui évoque un secret mais ne contient PUBLIQUEMENT rien de sensible
 * (ex. une clé publique de vérification). Vide aujourd'hui : chaque ajout doit être commenté et relu.
 * Note : les clés `JWKS` (ensemble de clés PUBLIQUES) ne correspondent à aucun motif interdit, elles n'ont pas besoin d'exception.
 */
const ALLOWED_BRIDGE_KEYS = new Set([]);

/**
 * @param {string} bridgeName Nom du pont (pour le message d'erreur).
 * @param {Iterable<string>} keys Noms à contrôler (variables d'environnement et/ou clés `window`).
 * @throws {Error} Si un nom évoque un secret et n'est pas dans la liste d'exceptions.
 */
function assertSafeBridgeKeys(bridgeName, keys) {
  const offending = [...keys].filter((key) => FORBIDDEN_BRIDGE_KEY.test(key) && !ALLOWED_BRIDGE_KEYS.has(key));
  if (offending.length > 0) {
    throw new Error(
      `Pont ${bridgeName} : ${offending.join(', ')} évoque un secret. Tout ce qui passe par un pont est embarqué en clair ` +
        `dans le navigateur. Ne jamais y mettre de secret ; si c'est une valeur PUBLIQUE, l'ajouter à ALLOWED_BRIDGE_KEYS ` +
        `(tools/env-bridge.js) avec un commentaire justifiant.`,
    );
  }
}

module.exports = { assertSafeBridgeKeys, FORBIDDEN_BRIDGE_KEY, ALLOWED_BRIDGE_KEYS };
