/** @module @category Utility */

import { type NameUse } from '@egen/esm-globals';

/**
 * Gets the formatted display name for an entity.
 *
 * The display name is taken from the entity's 'usual' name,
 * or falls back to the entity's 'official' name.
 *
 * @param entity The entity details in FHIR format.
 * @returns The entity's display name, or an empty string if no name is present.
 *
 * @example
 * ```ts
 * import { getEntityName } from '@egen/esm-framework';
 * const name = getEntityName(entity); // "Alice Martin"
 * ```
 */
export function getEntityName(entity: fhir.Patient): string {
  const name = selectPreferredName(entity, 'usual', 'official');
  return formatEntityName(name);
}

/**
 * @deprecated Use `getEntityName` instead.
 */
export function getPatientName(entity: fhir.Patient) /* @deprecated use getEntityName */ : string {
  return getEntityName(entity);
}

/**
 * @deprecated Use `getEntityName` instead.
 */
export function displayName(entity: fhir.Patient): string {
  return getEntityName(entity);
}

/**
 * Get a formatted display string for an FHIR HumanName.
 *
 * @param name The name to format.
 * @returns The formatted display name, or an empty string if undefined.
 */
export function formatEntityName(name: fhir.HumanName | undefined): string {
  if (name) return name.text ?? defaultFormat(name);
  return '';
}

/**
 * @deprecated Use `formatEntityName` instead.
 */
export function formatPatientName(name: fhir.HumanName | undefined) /* @deprecated use formatEntityName */ : string {
  return formatEntityName(name);
}

/**
 * @deprecated Use `formatEntityName` instead.
 */
export function formattedName(name: fhir.HumanName | undefined): string {
  return formatEntityName(name);
}

/**
 * Select the preferred name from the collection of names associated with an entity.
 *
 * Names may be specified with a usage such as 'usual', 'official', 'nickname', 'maiden', etc.
 * A name with no usage specified is treated as the 'usual' name.
 *
 * The chosen name is selected according to the priority order of `preferredNames`.
 *
 * @param entity The entity from whom a name will be selected.
 * @param preferredNames Optional ordered sequence of preferred name usages; defaults to 'usual'.
 * @returns The preferred name for the entity, or undefined if no acceptable name could be found.
 *
 * @example
 * ```ts
 * // Prefer usual name, fallback to official
 * selectPreferredName(entity, 'usual', 'official')
 * // Prefer usual, then nickname, then official
 * selectPreferredName(entity, 'usual', 'nickname', 'official')
 * ```
 */
export function selectPreferredName(entity: fhir.Patient, ...preferredNames: NameUse[]): fhir.HumanName | undefined {
  if (preferredNames.length === 0) {
    preferredNames = ['usual'];
  }
  for (const usage of preferredNames) {
    const name = entity.name?.find((name) => nameUsageMatches(name, usage));
    if (name) return name;
  }
  return undefined;
}

function defaultFormat(name: fhir.HumanName): string {
  const forenames: string[] = name.given ?? [];
  const names: string[] = name.family ? forenames.concat(name.family) : forenames;
  return names.join(' ');
}

function nameUsageMatches(name: fhir.HumanName, usage: NameUse): boolean {
  if (!name.use) return usage === 'usual';
  return name.use === usage;
}
