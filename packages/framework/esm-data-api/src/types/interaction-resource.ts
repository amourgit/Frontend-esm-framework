import { type EgenResource } from '@egen/esm-api';
import { type Classification } from './classification-resource';
import { type Location } from './location-resource';
import { type DataPoint } from './datapoint-resource';
import { type Entity } from './entity-resource';
import { type WorkSession } from './session-resource';

/**
 * Represents a generic interaction — a discrete event or transaction involving
 * an entity at a specific point in time (replaces domain-specific "Encounter").
 */
export interface Interaction extends EgenResource {
  interactionDatetime?: string;
  entity?: Entity;
  location?: Location;
  interactionType?: InteractionType;
  dataPoints?: Array<DataPoint>;
  session?: WorkSession;
  interactionHandlers?: Array<InteractionHandler>;
  classifications?: Array<Classification>;
  form?: EgenResource;
}

/**
 * Describes the type/category of an interaction (e.g. "intake", "review", "export").
 */
export interface InteractionType extends EgenResource {
  name?: string;
  description?: string;
  retired?: boolean;
}

/**
 * Represents a handler/participant in an interaction (e.g. an agent, operator, staff member).
 */
export interface InteractionHandler extends EgenResource {
  handler?: EgenResource;
  handlerRole?: HandlerRole;
}

/**
 * The role played by a handler within an interaction.
 */
export interface HandlerRole extends EgenResource {
  name?: string;
  description?: string;
  retired?: boolean;
}
