import { type Concept, type EgenResource } from '@egen/esm-api';
import { type CatalogItem } from './catalog-item-resource';

export type TaskFulfillmentStatus =
  | 'COMPLETED'
  | 'DECLINED'
  | 'DISCONTINUED'
  | 'DRAFT'
  | 'EXCEPTION'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'RECEIVED';

export type TaskAction = 'DISCONTINUE' | 'NEW' | 'RENEW' | 'REVISE';

export type TaskUrgency = 'ON_SCHEDULED_DATE' | 'ROUTINE' | 'URGENT';

/**
 * Represents a generic task or work item assigned in the system
 * (replaces domain-specific "Order" / prescription).
 * Can be used for: assignments, work orders, approvals, requests, etc.
 */
export interface Task extends EgenResource {
  uuid: string;
  action: TaskAction;
  asNeeded: boolean;
  asNeededCondition?: string;
  autoExpireDate: string;
  brandName?: string;
  context: EgenResource;
  comment: string;
  concept: Concept;
  dateActivated: string;
  dateStopped?: string | null;
  catalogItem: CatalogItem;
  quantity: number;
  duration: number;
  durationUnits: EgenResource;
  interaction: EgenResource;
  frequency: EgenResource;
  instructions?: string | null;
  numRefills: number;
  taskNumber: string;
  taskReason: Concept | null;
  taskReasonNonCoded: string | null;
  taskType: {
    conceptClasses: Array<any>;
    description: string;
    display: string;
    name: string;
    parent: string | null;
    retired: boolean;
    uuid: string;
  };
  assignedTo: {
    display: string;
    person: {
      display: string;
    };
    uuid: string;
  };
  entity: EgenResource;
  previousTask: { uuid: string; type: string; display: string } | null;
  quantityUnits: EgenResource;
  urgency: TaskUrgency;

  // additional properties
  accessionNumber: string;
  scheduledDate: string;
  display: string;
  fulfillmentStatus: TaskFulfillmentStatus;
  fulfillmentComment: string;
  laterality: string;
  contextHistory: string;
  numberOfRepeats: number;
  type: string;
}
