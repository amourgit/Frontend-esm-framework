import { type Concept, type EgenResource, type Person } from '@egen/esm-api';
import { type Interaction } from './interaction-resource';
import { type Location } from './location-resource';

/**
 * Represents a generic data point — a single recorded observation or measurement
 * tied to an interaction (replaces domain-specific "Obs" / Observation).
 * Can represent form answers, survey responses, sensor readings, audit values, etc.
 */
export interface DataPoint extends EgenResource {
  concept?: Concept;
  subject?: Person;
  recordedAt?: string;
  accessionNumber?: string;
  dataPointGroup?: DataPoint;
  valueCodedName?: EgenResource;
  groupMembers?: Array<DataPoint>;
  comment?: string;
  location?: Location;
  order?: EgenResource;
  interaction?: Interaction;
  value?: number | string | boolean | EgenResource;
  valueModifier?: string;
  formFilePath?: string;
  formFiledNamespace?: string;
  status?: 'DRAFT' | 'FINAL' | 'REVISED';
  interpretation?: string;
}
