import { type EgenResource, type ReferenceTerm } from '@egen-civitas/esm-api';
import { type Interaction } from './interaction-resource.js';
import { type Entity } from './entity-resource.js';

/**
 * Represents a generic classification or tag attached to an entity or interaction
 *.
 * Can be used for categorization in any domain: CRM tags, risk scores, audit flags, etc.
 */
export interface Classification extends EgenResource {
  category?: {
    coded?: {
      uuid: string;
      display?: string;
      name?: ReferenceTerm;
      datatype?: EgenResource;
      category?: EgenResource;
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
