import { type EgenResource } from './egen-resource.js';

/**
 * Terme de référence générique : une valeur d'un référentiel (catégorie, statut, type de donnée…),
 * quel que soit le domaine d'application.
 */
export interface ReferenceTerm extends EgenResource {
  name?: string;
  /** Type de valeur attendu pour ce terme (ex. nombre, texte, date). */
  datatype?: EgenResource;
  /** Regroupement du terme dans le référentiel. */
  category?: EgenResource;
  retired?: boolean;
}
