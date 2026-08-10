import { type EgenResource } from './egen-resource';

// TODO: make this extends EgenResourceStrict
export interface Concept extends EgenResource {
  name?: ConceptName;
  datatype?: ConceptDatatype;
  conceptClass?: ConceptClass;
  set?: boolean;
  version?: string;
  retired?: boolean;
  names?: Array<ConceptName>;
  descriptions?: Array<EgenResource>;
  // TODO: add better typings
  mappings?: any;
  answers?: any;
  setMembers?: any;
  attributes?: any;
}

export interface ConceptDatatype extends EgenResource {
  name?: string;
  description?: string;
  hl7Abbreviation?: string;
  retired?: boolean;
}

export interface ConceptName extends EgenResource {
  name?: string;
  locale?: string;
  localPreferred?: boolean;
  conceptNameType?: 'FULLY_SPECIFIED' | 'SHORT' | 'INDEX_TERM';
}

export interface ConceptClass extends EgenResource {
  name?: string;
  description?: string;
  retired?: boolean;
}
