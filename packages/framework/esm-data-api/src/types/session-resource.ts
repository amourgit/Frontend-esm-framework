import { type EgenResource } from '@egen/esm-api';
import { type Interaction } from './interaction-resource';
import { type Entity } from './entity-resource';

/**
 * Payload to create a new session.
 * A session groups a set of interactions performed by or for an entity
 * at a given location and time.
 */
export interface NewWorkSessionPayload {
  uuid?: string;
  location: string;
  entity?: string;
  startDatetime: Date;
  sessionType: string;
  stopDatetime?: Date;
  attributes?: Array<{
    attributeType: string;
    value: string;
  }>;
}

export type UpdateWorkSessionPayload = Partial<NewWorkSessionPayload> & {};

/**
 * Represents an active or past session for an entity.
 */
export interface WorkSession {
  uuid: string;
  display?: string;
  interactions?: Array<Interaction>;
  entity?: Entity;
  sessionType: WorkSessionType;
  location?: WorkSessionLocation;
  startDatetime: string;
  stopDatetime: string | null;
  attributes?: Array<EgenResource>;
  [anythingElse: string]: any;
}

interface WorkSessionLocation {
  uuid: string;
  display?: string;
  name?: string;
}

/**
 * Describes the type/category of a session (e.g. "onboarding", "review", "audit").
 */
export interface WorkSessionType {
  uuid: string;
  display: string;
  name?: string;
}
