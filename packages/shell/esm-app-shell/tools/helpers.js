/**
 * Removes the trailing slash from a path
 *
 * @param {string} path - The path to remove the trailing slash from
 * @returns {string} The path without a trailing slash
 */
exports.removeTrailingSlash = (path) => {
  const i = path.length - 1;
  return path[i] === '/' ? exports.removeTrailingSlash(path.slice(0, i)) : path;
};

/**
 * Left-pads a number to ensure it is exactly two characters
 *
 * @param {string | number} num - The number to pad
 * @returns {string} The number as a string, padded to two places
 */
const padToTwoDigits = (num) => {
  return num.toString().padStart(2, '0');
};

exports.getTimestamp = () => {
  const today = new Date();
  const dd = padToTwoDigits;
  return `${today.getFullYear()}${dd(today.getMonth() + 1)}${dd(today.getDate())}`;
};

// Une chaine JS non vide est toujours truthy, donc process.env.EGEN_ESM_IMPORTMAP
// valant "{}" ou '{"imports":{}}' (comme le font build:production/watch)
// activait a tort la variante figee (Def) du template EJS au lieu de la
// variante dynamique (Url) — meme quand l'intention etait "pas d'importmap
// fournie au build, laisse le consommateur (egen develop, ou un vrai
// backend) la fournir au runtime en servant importmap.json/routes.registry.json".
// Une import map ou un registre de routes semantiquement vide est donc
// traite comme une valeur absente — chaque predicat connait la vraie forme
// attendue plutot que de deviner sur un simple "objet vide au niveau racine"
// (qui aurait rate le cas reel '{"imports":{}}').
exports.isMeaningfulImportmap = (value) => {
  if (!value) {
    return false;
  }
  try {
    const parsed = JSON.parse(value);
    return !!(parsed && parsed.imports && Object.keys(parsed.imports).length > 0);
  } catch {
    // JSON invalide : on ne devine pas, on considere la valeur comme significative
    // (elle echouera plus tard, de facon plus explicite, au parsing cote client).
    return true;
  }
};

exports.isMeaningfulRoutesRegistry = (value) => {
  if (!value) {
    return false;
  }
  try {
    const parsed = JSON.parse(value);
    return !!(parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0);
  } catch {
    return true;
  }
};
