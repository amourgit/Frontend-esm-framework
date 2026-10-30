import { type EgenResource, type Person, type ReferenceTerm } from '@egen-civitas/esm-api';
import { type Interaction } from './interaction-resource.js';
import { type Location } from './location-resource.js';

/**
 * Represents a generic data point — a single recorded observation or measurement
 * tied to an interaction.
 * Can represent form answers, survey responses, sensor readings, audit values, etc.
 */
export interface DataPoint extends EgenResource {
  term?: ReferenceTerm;
  subject?: Person;
  recordedAt?: string;
  accessionNumber?: string;
  dataPointGroup?: DataPoint;
  valueTerm?: EgenResource;
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
