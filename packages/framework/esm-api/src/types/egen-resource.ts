import { type User } from './user-resource';

export interface EgenResource extends EgenResourceStrict {
  [anythingElse: string]: any;
}

/**
 * Superclass for all Egen Resources, with strict typings.
 * If the subclass does not have all attributes (including optional ones)
 * accounted for, use EgenResource instead.
 */
export interface EgenResourceStrict {
  uuid: string;
  display?: string;
  links?: Array<Link>;
  auditInfo?: AuditInfo;
  resourceVersion?: string;
}

export interface Link {
  rel: string;
  uri: string;
  resourceAlias?: string;
}

export interface AuditInfo {
  dateCreated?: string;
  creator?: User;
  dateChanged?: string;
  changedBy?: User;
  voided?: boolean;
  dateVoided?: string;
  voidedBy?: User;
  voidReason?: string;
  retired?: boolean;
  datedRetired?: string;
  retiredBy?: User;
  retireReason?: string;
}
