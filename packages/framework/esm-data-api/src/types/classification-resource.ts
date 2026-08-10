import { type Concept, type ConceptClass, type EgenResource } from '@egen/esm-api';
import { type Interaction } from './interaction-resource';
import { type Entity } from './entity-resource';

/**
 * Represents a generic classification or tag attached to an entity or interaction
 * (replaces domain-specific "Diagnosis").
 * Can be used for categorization in any domain: CRM tags, risk scores, audit flags, etc.
 */
export interface Classification extends EgenResource {
  category?: {
    coded?: {
      uuid: string;
      display?: string;
      name?: Concept;
      datatype?: EgenResource;
      conceptClass?: ConceptClass;
    };
    nonCoded?: string;
  };
  entity?: Entity;
  interaction?: Interaction;
  certainty?: string;
  rank?: number;
  formFieldNamespace?: string;
  formFieldPath?: string;
  voided?: boolean;
}
