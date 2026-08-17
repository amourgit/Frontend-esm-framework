import type { Session } from './user-resource.js';

export interface FetchResponse<T = any> extends Response {
  data: T;
}

export interface LoggedInUserFetchResponse extends FetchResponse {
  data: Session;
}
