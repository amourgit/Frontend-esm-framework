import { type EgenResourceStrict } from '@egen/esm-api';

/**
 * Represents an identifier type for an entity (e.g. national ID, employee number).
 */
export interface EntityIdentifierType extends EgenResourceStrict {
  name?: string;
  description?: string;
  format?: string;
  formatDescription?: string;
  required?: boolean;
  validator?: string;
  locationBehavior?: string;
  uniquenessBehavior?: string;
  retired?: boolean;
}

/**
 * Represents a generic entity in the system (replaces domain-specific "Patient").
 * An entity can be any actor: a user, a customer, a student, an employee, etc.
 */
export interface Entity extends EgenResourceStrict {
  identifiers?: EntityIdentifier[];
  attributes?: EntityAttribute[];
  voided?: boolean;
}

/**
 * An identifier associated with an entity.
 */
export interface EntityIdentifier extends EgenResourceStrict {
  identifier?: string;
  identifierType?: EntityIdentifierType;
  location?: Location;
  preferred?: boolean;
  voided?: boolean;
}

/**
 * A custom attribute attached to an entity.
 */
export interface EntityAttribute extends EgenResourceStrict {
  attributeType?: EgenResourceStrict;
  value?: string | number | boolean;
  voided?: boolean;
}
