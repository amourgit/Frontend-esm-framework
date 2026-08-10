import { type EgenResource } from './egen-resource';
import { type Person } from './person-resource';

export interface Session {
  allowedLocales?: Array<string>;
  authenticated: boolean;
  locale?: string;
  sessionId: string;
  user?: LoggedInUser;
  currentProvider?: { uuid: string; identifier: string };
  sessionLocation?: SessionLocation;
}

export interface LoggedInUser {
  uuid: string;
  display: string;
  username: string;
  systemId: string;
  userProperties: {
    /**
     * Recently viewed entity UUIDs, stored as a comma-separated string.
     * To get the array: `user.userProperties.recentlyViewed.split(',')`
     */
    recentlyViewed?: string;
    /**
     * UUIDs of groups/lists the user has bookmarked, stored as comma-separated.
     */
    bookmarkedGroups?: string;
    /**
     * The UUID of the location the user has set as their default for next logins.
     */
    defaultLocation?: string;
    [key: string]: string | undefined;
  } | null;
  person: Person;
  privileges: Array<Privilege>;
  roles: Array<Role>;
  retired: boolean;
  locale: string;
  allowedLocales: Array<string>;
  [anythingElse: string]: any;
}

export interface SessionLocation {
  uuid: string;
  display: string;
  links: Array<any>;
}

export interface Privilege {
  uuid: string;
  name: string;
  display: string;
  links?: Array<any>;
}

export interface Role {
  uuid: string;
  name: string;
  display: string;
  links?: Array<any>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface User extends EgenResource {
  // TODO: add more attributes
}
